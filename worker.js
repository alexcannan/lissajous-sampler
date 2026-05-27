/**
 * Serves the Lissajous sampler as static HTML from the edge.
 *
 *   lissajous.space      -> dist/index.html      (regular 2D version)
 *   3d.lissajous.space   -> dist/3d/index.html   (3D version)
 *
 * The old uvicorn router redirected /popular and any /{sharecode} back to /,
 * so we preserve that: anything that isn't a real asset falls back to the
 * version's index.html.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const is3d = url.hostname === "3d.lissajous.space" ||
      url.hostname.startsWith("3d.");

    // Map the 3D subdomain onto the /3d/ asset prefix.
    if (is3d && !url.pathname.startsWith("/3d/")) {
      url.pathname = "/3d" + (url.pathname === "/" ? "/" : url.pathname);
    }

    // Try the requested asset first.
    let res = await env.ASSETS.fetch(new Request(url, request));
    if (res.status !== 404) return res;

    // Fallback: serve the version's root page (mirrors the old redirect-to-/).
    // Use the directory-style path so the asset router returns index.html
    // without a 307 redirect.
    const indexUrl = new URL(url);
    indexUrl.pathname = is3d ? "/3d/" : "/";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
