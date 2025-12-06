function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
export async function onRequest(context) {
    try {
        if (context.request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        const env = context.env;
        const clientPassword = context.request.headers.get('x-admin-password');
        if (env.ADMIN_PASSWORD && clientPassword !== env.ADMIN_PASSWORD) {
             return new Response(JSON.stringify({ success: false, message: '未授权：管理员密码错误' }), { status: 401 });
        }
        const formData = await context.request.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ success: false, message: '未找到文件' }), { status: 400 });
        }
        if (file.size > 2 * 1024 * 1024) {
             return new Response(JSON.stringify({ success: false, message: '文件过大，请上传 2MB 以内的图片' }), { status: 400 });
        }
        const timestamp = new Date().getTime();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}-${safeName}`;
        const filePath = `public/uploads/${fileName}`;
        const publicUrl = `/uploads/${fileName}`;
        const arrayBuffer = await file.arrayBuffer();
        const contentBase64 = arrayBufferToBase64(arrayBuffer);
        const branchToUse = env.BRANCH_NAME || 'main';
        const GITHUB_API_URL = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${filePath}`;
        const response = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.com.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Cloudflare-Worker-Upload'
            },
            body: JSON.stringify({
                message: `feat: upload ${fileName} via web UI`,
                content: contentBase64,
                branch: branchToUse
            }),
        });
        if (!response.ok) {
            const errorText = await response.json();
            throw new Error(`GitHub 上传失败: ${errorText.message}`);
        }
        const data = await response.json();
        return new Response(JSON.stringify({ 
            success: true, 
            message: '上传成功',
            url: publicUrl,
            commit_url: data.commit.html_url
        }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
}