export const config = { runtime: 'edge' };

export default async function handler(request) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
    }

    try {
        const env = process.env;
        const clientPassword = request.headers.get('x-admin-password');
        
        if (!env.ADMIN_PASSWORD) {
             return new Response(JSON.stringify({ success: false, message: '系统未配置管理员密码，拒绝访问' }), { 
                 status: 403,
                 headers: { 'Content-Type': 'application/json' }
             });
        }
        
        if (clientPassword !== env.ADMIN_PASSWORD) {
             return new Response(JSON.stringify({ success: false, message: '密码错误' }), { 
                 status: 401,
                 headers: { 'Content-Type': 'application/json' }
             });
        }

        return new Response(JSON.stringify({ success: true, message: '验证成功' }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}