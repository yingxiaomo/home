export const config = { runtime: 'edge' };
const base64Encode = (str) => btoa(unescape(encodeURIComponent(str)));
const base64Decode = (b64) => decodeURIComponent(escape(atob(b64)));
const FILE_PATH = 'src/config/nav.js';
async function getCurrentFile(env, branchName) {
    const GITHUB_API_URL = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${FILE_PATH}?ref=${branchName}`;
    if (!env.GITHUB_TOKEN) throw new Error("GitHub Token未配置");
    const response = await fetch(GITHUB_API_URL, {
        headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.com.v3+json', 'User-Agent': 'Vercel-Edge-Commit' }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`无法获取文件：${response.status}. 详情: ${errorText}`);
    }
    const data = await response.json();
    const fileContent = base64Decode(data.content);
    return { sha: data.sha, content: fileContent };
}
function addNewGroupContent(oldContent, newGroup) {
    const newGroupObject = `,
  {
    title: "${newGroup.title}",
    icon: "${newGroup.icon}",
    items: [
    ]
  }`;
    const navDataArrayEndRegex = new RegExp(`(export\s+const\s+navData\s*=\s*\[[\s\S]*?)\]\s*;`, 'm');
    const match = oldContent.match(navDataArrayEndRegex);
    if (!match) throw new Error(`nav.js 文件格式不匹配：无法找到顶层 navData 数组。`);
    const insertionPoint = match.index + match[1].length;
    let contentToInsert = newGroupObject;
    const arrayStart = oldContent.lastIndexOf('[', insertionPoint);
    const contentBeforeClosingBracket = oldContent.substring(arrayStart + 1, insertionPoint).trim();
    if (contentBeforeClosingBracket === '') {
        contentToInsert = contentToInsert.substring(1); 
    }
    return oldContent.slice(0, insertionPoint) + contentToInsert + oldContent.slice(insertionPoint);
}
async function commitNewFile(sha, newContent, env, branchName, groupName) {
    const GITHUB_API_URL = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${FILE_PATH}`;
    const commitMessage = `feat: add new folder "${groupName}" via web UI`;
    const response = await fetch(GITHUB_API_URL, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.com.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Vercel-Edge-Commit',
        },
        body: JSON.stringify({
            message: commitMessage,
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
export default async function handler(request) {
    try {
        if (request.method !== 'POST') return new Response(JSON.stringify({ success: false, message: '只支持 POST 请求' }), { status: 405 });
        const env = process.env;
        const clientPassword = request.headers.get('x-admin-password');
        if (env.ADMIN_PASSWORD && clientPassword !== env.ADMIN_PASSWORD) {
             return new Response(JSON.stringify({ success: false, message: '未授权：管理员密码错误' }), { status: 401 });
        }
        const { title, icon } = await request.json();
        if (!title) return new Response(JSON.stringify({ success: false, message: '缺少分组名称。' }), { status: 400 });
        const branchToUse = env.BRANCH_NAME || 'main'; 
        const newGroup = { title, icon: icon || 'ri:folder-line', items: [] };
        const { sha, content } = await getCurrentFile(env, branchToUse);
        const updatedContent = addNewGroupContent(content, newGroup);
        const commitData = await commitNewFile(sha, updatedContent, env, branchToUse, title);
        return new Response(JSON.stringify({ 
            success: true, 
            message: `文件夹 "${title}" 添加成功！`,
            commit_url: commitData.commit.html_url
        }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
}