const base64Encode = (str) => btoa(unescape(encodeURIComponent(str)));
const base64Decode = (b64) => decodeURIComponent(escape(atob(b64)));
const FILE_PATH = 'src/config/site-data.json';
async function getCurrentFile(env, branchName) {
    const GITHUB_API_URL = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${FILE_PATH}?ref=${branchName}`;
    if (!env.GITHUB_TOKEN) throw new Error("GitHub Token未配置");
    const response = await fetch(GITHUB_API_URL, {
        headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.com.v3+json', 'User-Agent': 'Cloudflare-Worker-Commit' }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`无法获取文件: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    return { sha: data.sha };
}
async function commitNewFile(sha, newContent, env, branchName) {
    const GITHUB_API_URL = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${FILE_PATH}`;
    const response = await fetch(GITHUB_API_URL, {
        method: 'PUT',
        headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.com.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'Cloudflare-Worker-Commit' },
        body: JSON.stringify({
            message: "chore: update site config via web UI",
            content: base64Encode(newContent),
            sha: sha,
            branch: branchName
        }),
    });
    if (!response.ok) {
        const errorText = await response.json();
        throw new Error(`GitHub 提交失败: ${errorText.message}`);
    }
    return response.json();
}
export async function onRequest(context) {
    try {
        if (context.request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        const env = context.env;
        const clientPassword = context.request.headers.get('x-admin-password');
        if (!env.ADMIN_PASSWORD) {
             return new Response(JSON.stringify({ success: false, message: '系统未配置管理员密码，拒绝访问' }), { status: 403 });
        }
        if (clientPassword !== env.ADMIN_PASSWORD) {
             return new Response(JSON.stringify({ success: false, message: '未授权：管理员密码错误' }), { status: 401 });
        }
        const newConfig = await context.request.json();
        const branchToUse = env.BRANCH_NAME || 'main';
        const { sha } = await getCurrentFile(env, branchToUse);
        const jsonString = JSON.stringify(newConfig, null, 2);
        const commitData = await commitNewFile(sha, jsonString, env, branchToUse);
        return new Response(JSON.stringify({ 
            success: true, 
            message: `配置更新成功！`,
            commit_url: commitData.commit.html_url
        }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
}