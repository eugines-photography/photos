import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  try {
    const {results} = await env.DB!.prepare('SELECT id, title, tags, created_at FROM photos ORDER BY created_at DESC').all();
    return json(results.map((p: any) => ({ id: p.id, title: p.title, tags: JSON.parse(p.tags), createdAt: p.created_at, src: '/api/photos/' + p.id, sample: false })));
  } catch { return json({error: 'Your library could not be loaded. Please try again.'}, 503); }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json({error: 'Invalid request origin.'}, 403);
    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File) || !['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(file.type)) return json({error: 'Please choose a JPG, PNG, WebP, GIF, or AVIF image.'}, 400);
    if (!file.size || file.size > 20 * 1024 * 1024) return json({error: 'Each photo must be under 20 MB.'}, 400);
    const title = String(data.get('title') || file.name.replace(/\.[^.]+$/, '')).trim().slice(0, 120);
    const tags = [...new Set(String(data.get('tags') || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20).map(t => t.slice(0, 40));
    const id = crypto.randomUUID(); const createdAt = Date.now();
    await env.BUCKET!.put(id, file.stream(), {httpMetadata:{contentType:file.type}});
    try { await env.DB!.prepare('INSERT INTO photos (id,title,tags,filename,content_type,created_at) VALUES (?,?,?,?,?,?)').bind(id,title,JSON.stringify(tags),file.name,file.type,createdAt).run(); }
    catch (e) { await env.BUCKET!.delete(id); throw e; }
    return json({id,title,tags,createdAt,src:'/api/photos/'+id,sample:false}, 201);
  } catch {return json({error: 'Upload failed. Your photo has not been added. Please try again.'}, 500);}
}
