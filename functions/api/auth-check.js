export async function onRequest(context) {
    try {
        const env = context.env;
        const clientPassword = context.request.headers.get('x-admin-password');
        
        if (!env.ADMIN_PASSWORD) {
             return new Response(JSON.stringify({ success: false, message: '系统未配置管理员密码，拒绝访问' }), { status: 403 });
        }
        
        if (clientPassword !== env.ADMIN_PASSWORD) {
             return new Response(JSON.stringify({ success: false, message: '密码错误' }), { status: 401 });
        }

        return new Response(JSON.stringify({ success: true, message: '验证成功' }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
}