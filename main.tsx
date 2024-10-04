import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { parse } from "@libs/xml";
import { escape } from "@std/html/entities";

type Item = { link: any; pubDate: string; description: string };

function linkify(text: string): string {
  if (!text) {
    return "";
  }
  text = escape(text.replaceAll("&#xA;", " "));
  const urlRegex = /((https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/g;

  return text.replace(
    urlRegex,
    (match, p1) => {
      const url = p1.startsWith('http') ? p1 : `https://${p1}`;
      if (URL.canParse(url)) {
        return `<a href="${url}" target="_blank">${match}</a>`;
      }
      return p1;
    }
  );
}

const app = new Hono();
app.use("/static/*", serveStatic({ root: "./" }));
app.get("/p/:account", async (c) => {
  let account = c.req.param("account");
  if (!account.includes(".") && !account.includes(":")) {
    account = `${account}.bsky.social`;
  }
  const res = await fetch(`https://bsky.app/profile/${account}/rss`);
  if (res.status === 404 || res.status === 400) {
    return c.text(res.statusText, { status: res.status });
  }
  const text = await res.text();
  const rss = parse(text).rss as any;
  const items = rss.channel.item as Item[];
  if (!items) {
    return c.text("Not Found", { status: 404 });
  }
  const description = { __html: linkify(rss.channel.description) };
  const listOnly = c.req.query("listOnly");
  return c.html(
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/terminal.css@0.7.4/dist/terminal.min.css"
        />
        <link rel="stylesheet" href="/static/style.css" />
        <title>bsky-head - {rss.channel.title}</title>
      </head>
      <body>
        {listOnly == null &&
          <>
            <div class="terminal-nav">
              <header class="terminal-logo">
                <div class="logo terminal-prompt">
                  <a href={rss.channel.link} target="_blank">{rss.channel.title}</a>
                </div>
              </header>
            </div>
            <div dangerouslySetInnerHTML={description}></div>
          </>
        }
        {items.map((item) => {
          const __html = linkify(item.description);
          const inner = { __html };
          return (
            <ul>
              <li>
                {
                  <a target="_blank" href={item.link}>
                    {new Date(Date.parse(item.pubDate)).toISOString().replace(
                      ":00.000Z",
                      "",
                    )}
                  </a>
                } <span dangerouslySetInnerHTML={inner}></span>
              </li>
            </ul>
          );
        })}
      </body>
    </html>,
  );
}).get("/", async (c) => {
  return c.html(
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/terminal.css@0.7.4/dist/terminal.min.css"
        />
        <link rel="stylesheet" href="/static/style.css" />
        <title>bsky-head</title>
      </head>
      <body>
        <div class="container">
          <div class="terminal-nav">
            <div class="logo">bsky-head</div>
          </div>
          <form onsubmit="location.href = '/p/' + document.getElementById('input').value; return false;">
            <input id="input" type="text" placeholder="bluesky account" autofocus />
          </form>
        </div>
      </body>
    </html>
  );
});

Deno.serve(app.fetch);
