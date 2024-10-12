import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { parse } from "@libs/xml";

import linkifyHtml from "linkify-html";

type Item = { link: string; pubDate: string; description: string };

const urlRegex =
  /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

function linkify(text: string): string {
  return linkifyHtml(text, {
    target: "_blank",
    defaultProtocol: "https",
    validate: {
      url: (value) => urlRegex.test(value),
    },
  });
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
  // deno-lint-ignore no-explicit-any
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
          (
            <>
              <div class="terminal-nav">
                <header class="terminal-logo">
                  <div class="logo terminal-prompt">
                    <a href={rss.channel.link} target="_blank">
                      {rss.channel.title}
                    </a>
                  </div>
                </header>
              </div>
              <div dangerouslySetInnerHTML={description}></div>
            </>
          )}
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
}).get("/", (c) => {
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
            <input
              id="input"
              type="text"
              placeholder="bluesky account"
              autofocus
            />
          </form>
        </div>
      </body>
    </html>,
  );
});

Deno.serve(app.fetch);
