const base64Encode = (str) => btoa(unescape(encodeURIComponent(str)));
const base64Decode = (b64) => decodeURIComponent(escape(atob(b64)));
const FILE_PATH = 'src/config/nav.js';
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
    return { sha: data.sha, content: base64Decode(data.content) };
}
function deleteLinkFromContent(content, groupTitle, targetUrl) {
    const groupRegex = new RegExp(`(title:\s*"${groupTitle}"[\s\S]*?items:\s*\[)([\s\S]*?)(\])`, 'm');
    const match = content.match(groupRegex);
    if (!match) throw new Error(`未找到分组: "${groupTitle}"`);
    const fullMatch = match[0];
    const prefix = match[1]; 
    const itemsContent = match[2]; 
    const suffix = match[3]; 
    const escapedUrl = targetUrl.replace(/[.*+?^${}()|[\\]/g, '\\$&');
    const itemRegex = new RegExp(`\s*\{\s*name:[\s\S]*?url:\s*["']${escapedUrl}["']\s*\}\s*,?`, 'g');
    if (!itemRegex.test(itemsContent)) {
        throw new Error(`在分组 "${groupTitle}" 中未找到链接: ${targetUrl}`);
    }
    let newItemsContent = itemsContent.replace(itemRegex, '');
    newItemsContent = newItemsContent.replace(/^\s*[\r\n]/gm, '');
    return content.replace(fullMatch, prefix + newItemsContent + suffix);
}
function addLinkToContent(content, groupTitle, link) {
    const linkStr = `,
      { name: "${link.name}", icon: "${link.icon}", url: "${link.url}" }`;
    const itemsEndRegex = new RegExp(`([\s\S]*?title:\s*"${groupTitle}"[\s\S]*?items:\s*\[[\s\S]*?)\]`, 'm');
    const match = content.match(itemsEndRegex);
    if (!match) throw new Error(`未找到分组: "${groupTitle}"`);
    const insertionPoint = match.index + match[1].length;
    let contentToInsert = linkStr;
    const contentBefore = content.substring(content.lastIndexOf('[', insertionPoint) + 1, insertionPoint).trim();
    if (contentBefore === '') {
        contentToInsert = contentToInsert.substring(1); 
    }
    return content.slice(0, insertionPoint) + contentToInsert + content.slice(insertionPoint);
}
async function commitNewFile(sha, newContent, env, branchName, message) {
    const GITHUB_API_URL = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${FILE_PATH}`;
    const response = await fetch(GITHUB_API_URL, {
        method: 'PUT',
        headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.com.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'Cloudflare-Worker-Commit' },
        body: JSON.stringify({
            message: message,
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
        if (env.ADMIN_PASSWORD && clientPassword !== env.ADMIN_PASSWORD) {
             return new Response(JSON.stringify({ success: false, message: '未授权' }), { status: 401 });
        }
        const payload = await context.request.json(); 
        const branchToUse = env.BRANCH_NAME || 'main';
        const { sha, content } = await getCurrentFile(env, branchToUse);
        let updatedContent = content;
        let msg = '';
        if (payload.action === 'DELETE') {
            updatedContent = deleteLinkFromContent(content, payload.oldGroupTitle, payload.originalUrl);
            msg = `chore: delete link ${payload.originalUrl} from ${payload.oldGroupTitle}`;
        } else if (payload.action === 'MOVE') {
            updatedContent = deleteLinkFromContent(content, payload.oldGroupTitle, payload.originalUrl);
            updatedContent = addLinkToContent(updatedContent, payload.newGroupTitle, payload.newLink);
            msg = `chore: update link ${payload.newLink.name}`;
        } else {
            return new Response(JSON.stringify({ success: false, message: 'Unknown action' }), { status: 400 });
        }
        const commitData = await commitNewFile(sha, updatedContent, env, branchToUse, msg);
        return new Response(JSON.stringify({ 
            success: true, 
            message: '操作成功',
            commit_url: commitData.commit.html_url
        }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
}
