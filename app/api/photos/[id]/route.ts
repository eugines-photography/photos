import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
type Context = {params: Promise<{id:string}>};
export async function GET(_request: Request, context: Context) {
  const {id} = await context.params;
  const photo = await env.BUCKET!.get(id);
  if (!photo) return new Response('Photo not found', {status:404});
  return new Response(photo.body, {headers:{'Content-Type':photo.httpMetadata?.contentType || 'image/jpeg','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});
}
export async function PATCH(request: Request, context: Context) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return Response.json({error:'Invalid origin'}, {status:403});
    const {id} = await context.params;
    const data = await request.json() as {title:string,tags:string[]};
    if (!data.title?.trim() || !Array.isArray(data.tags)) return Response.json({error:'Please enter a title.'},{status:400});
    const tags=[...new Set(data.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean))].slice(0,20).map(t=>t.slice(0,40));
    const result = await env.DB!.prepare('UPDATE photos SET title=?, tags=? WHERE id=?').bind(data.title.trim().slice(0,120), JSON.stringify(tags), id).run();
    if (!result.meta.changes) return Response.json({error:'Photo not found'},{status:404});
    return Response.json({ok:true});
  } catch {return Response.json({error:'Your changes could not be saved. Please try again.'},{status:500});}
}
