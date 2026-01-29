export async function GET() {
    return new Response('API IS WORKING', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    });
}
