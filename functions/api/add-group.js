/**
 * Cloudflare Pages Function: /api/add-group
 * 作用: 安全地调用 GitHub API，向 nav.js 的 navData 顶层数组中添加一个新的文件夹分组。
 * * 环境变量要求 (与 add-link.js 相同，需在 Cloudflare Pages Settings 中配置):
 * - GITHUB_TOKEN: 具有 repo 权限的 PAT
 * - REPO_OWNER: 仓库所有者
 * - REPO_NAME: 仓库名称
 * - BRANCH_NAME: (可选) 目标分支名称，如果未设置，默认为 'main'。
 */

// Cloudflare Workers 环境的 Base64 编码/解码工具
const base64Encode = (str) => btoa(unescape(encodeURIComponent(str)));
const base64Decode = (b64) => decodeURIComponent(escape(atob(b64)));

const FILE_PATH = 'src/config/nav.js';

// -----------------------------------------------------------
// 步骤 1: 获取文件当前内容和 SHA
// -----------------------------------------------------------
async function getCurrentFile(env, branchName) {
    const GITHUB_API_URL = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${FILE_PATH}?ref=${branchName}`;
    
    if (!env.GITHUB_TOKEN) {
        throw new Error("GitHub Token未配置。请检查 Cloudflare 环境变量。");
    }

    const response = await fetch(GITHUB_API_URL, {
        headers: {
            'Authorization': `token ${env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.com.v3+json',
            'User-Agent': 'Cloudflare-Worker-Commit',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`无法获取文件：${response.status}. 详情: ${errorText}`);
    }

    const data = await response.json();
    const fileContent = base64Decode(data.content);
    return { sha: data.sha, content: fileContent };
}

// -----------------------------------------------------------
// 步骤 2: 修改文件内容 (添加新分组)
// -----------------------------------------------------------
function addNewGroupContent(oldContent, newGroup) {
    // 构造新的分组对象字符串，确保格式匹配 nav.js 的风格
    const newGroupObject = `,\n  {\n    title: "${newGroup.title}",\n    icon: "${newGroup.icon}",\n    items: [\n\n    ]\n  }`;

    // 目标：找到 navData 数组的结束 ]，在其之前插入新对象
    // 匹配 export const navData = [ ... ]
    // 使用非贪婪匹配 [\\s\\S]*? 来确保只匹配到第一个 ]; 或 ]
    const navDataArrayEndRegex = new RegExp(
        `(export\\s+const\\s+navData\\s*=\\s*\\[[\\s\\S]*?)\\]\\s*;`, 
        'm'
    );

    const match = oldContent.match(navDataArrayEndRegex);
    if (!match) {
        throw new Error(`nav.js 文件格式不匹配：无法找到顶层 navData 数组。`);
    }

    // 插入点位于 match[1] 捕获组的末尾（即在最后一个 ] 之前）
    const insertionPoint = match.index + match[1].length;
    let contentToInsert = newGroupObject;
    
    // 检查数组是否为空。如果旧内容在 [ 和 ] 之间为空白，则移除开头的逗号。
    // 查找 [ 的位置
    const arrayStart = oldContent.lastIndexOf('[', insertionPoint);
    // 检查 [ 和插入点之间是否有内容
    const contentBeforeClosingBracket = oldContent.substring(arrayStart + 1, insertionPoint).trim();
    
    if (contentBeforeClosingBracket === '') {
        // 数组为空，移除新对象开头的逗号
        contentToInsert = contentToInsert.substring(1); 
    }

    const newContent = oldContent.slice(0, insertionPoint) + contentToInsert + oldContent.slice(insertionPoint);
    return newContent;
}

// -----------------------------------------------------------
// 步骤 3: 提交新的文件内容
// -----------------------------------------------------------
async function commitNewFile(sha, newContent, env, branchName, groupName) {
    const GITHUB_API_URL = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${FILE_PATH}`;
    const encodedContent = base64Encode(newContent);
    const commitMessage = `feat: add new folder "${groupName}" via web UI`;

    const commitData = {
        message: commitMessage,
        content: encodedContent,
        sha: sha,
        branch: branchName 
    };

    const response = await fetch(GITHUB_API_URL, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.com.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Cloudflare-Worker-Commit',
        },
        body: JSON.stringify(commitData),
    });

    if (!response.ok) {
        const errorText = await response.json();
        throw new Error(`GitHub 提交失败: ${response.status} - ${errorText.message}`);
    }
}

// -----------------------------------------------------------
// Cloudflare Pages Functions 入口
// -----------------------------------------------------------
export async function onRequest(context) {
    try {
        if (context.request.method !== 'POST') return new Response(JSON.stringify({ success: false, message: '只支持 POST 请求' }), { status: 405 });
        
        const { title, icon } = await context.request.json();
        const env = context.env;

        if (!title) return new Response(JSON.stringify({ success: false, message: '缺少分组名称。' }), { status: 400 });
        
        const branchToUse = env.BRANCH_NAME || 'main'; 
        const newGroup = { title, icon: icon || 'ri:folder-line', items: [] }; // items 数组为空

        // 1. 获取文件内容和 SHA
        const { sha, content } = await getCurrentFile(env, branchToUse);

        // 2. 修改文件内容
        const updatedContent = addNewGroupContent(content, newGroup);

        // 3. 提交新文件
        await commitNewFile(sha, updatedContent, env, branchToUse, title); // 提交时使用 title 作为名称

        return new Response(JSON.stringify({ 
            success: true, 
            message: `文件夹 "${title}" 添加成功！请等待部署完成。` 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error("Function Error:", error.message);
        return new Response(JSON.stringify({ 
            success: false, 
            message: `操作失败: ${error.message}` 
        }), { status: 500 });
    }
}