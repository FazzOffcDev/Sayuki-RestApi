/**
 * Temp Email feature:
 * - Try to create/get temp email from fakeemail.net by scraping the homepage
 * - Provide fallback using 1secmail API (reliable, documented)
 *
 * Endpoints:
 *  GET /api/temp-email/new               -> { status, provider, email, info }
 *  GET /api/temp-email/messages?email=   -> list messages (tries 1secmail)
 *  GET /api/temp-email/message?email=&id= -> message detail (1secmail)
 *  GET /api/temp-email/inbox-url?email=  -> direct fakeemail.net inbox URL to open in browser
 *
 * NOTE: fakeemail.net scraping is fragile; fallback to 1secmail used.
 */

const axios = require("axios");
const cheerio = require("cheerio");
const querystring = require("querystring");

module.exports = function (app, prefix = "") {
  // Helper: attempt to scrape fakeemail.net homepage to get a generated email
  async function scrapeFakeEmail() {
    try {
      const res = await axios.get("https://fakeemail.net/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (TempEmailFeature/1.0)"
        },
        timeout: 10000
      });

      const html = res.data;
      const $ = cheerio.load(html);

      // Heuristics: find the element that contains generated local part / domains
      // Inspect site HTML: look for inputs or elements near "Copy Refresh Change Delete"
      // We'll search for input elements or text that look like email parts.
      // NOTE: This is heuristic and may fail if site changes.

      // Try find an input or element with the email address
      // Many temp email pages put the email in an input with id/name or a .copy element.
      // We'll attempt multiple selectors:
      const candidates = [
        "input#email", "input[name=email]", "input[type=text].email", "input",
        ".mail", ".temp-mail", ".copy", ".email"
      ];

      // Try to find any visible text that looks like email (contains @)
      let foundEmail = null;

      // First try common selectors with value attribute
      for (const sel of candidates) {
        $(sel).each((i, el) => {
          if (foundEmail) return;
          const val = $(el).attr("value") || $(el).text() || $(el).attr("data-email") || "";
          if (val && val.includes("@")) {
            foundEmail = val.trim();
          }
        });
        if (foundEmail) break;
      }

      // fallback: search page text for pattern like word@domain.tld
      if (!foundEmail) {
        const text = $.root().text();
        const re = /[A-Za-z0-9._%+-]{3,}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
        const matches = text.match(re);
        if (matches && matches.length) foundEmail = matches[0];
      }

      if (!foundEmail) {
        // Could not discover email reliably
        return { ok: false, error: "could_not_parse_fakeemail" };
      }

      return { ok: true, email: foundEmail, provider: "fakeemail.net" };
    } catch (err) {
      return { ok: false, error: err.message || "scrape_error" };
    }
  }

  // Helper: 1secmail simple functions (fallback reliable API)
  const ONE_SEC_BASE = "https://www.1secmail.com/api/v1/";

  function splitEmail(email) {
    const parts = (email || "").split("@");
    if (parts.length !== 2) return null;
    return { login: parts[0], domain: parts[1] };
  }

  async function fetch1secMessages(email) {
    const e = splitEmail(email);
    if (!e) return { ok: false, error: "invalid_email" };
    const qs = querystring.stringify({ action: "getMessages", login: e.login, domain: e.domain });
    const url = `${ONE_SEC_BASE}?${qs}`;
    try {
      const r = await axios.get(url, { timeout: 10000 });
      return { ok: true, messages: r.data || [] };
    } catch (err) {
      return { ok: false, error: err.message || "1secmail_error" };
    }
  }

  async function fetch1secMessageById(email, id) {
    const e = splitEmail(email);
    if (!e) return { ok: false, error: "invalid_email" };
    const qs = querystring.stringify({ action: "readMessage", login: e.login, domain: e.domain, id });
    const url = `${ONE_SEC_BASE}?${qs}`;
    try {
      const r = await axios.get(url, { timeout: 10000 });
      return { ok: true, message: r.data };
    } catch (err) {
      return { ok: false, error: err.message || "1secmail_error" };
    }
  }

  // Endpoint: create/get new temporary email
  app.get(`${prefix}/temp-email/new`, async (req, res) => {
    // try fakeemail.net first
    const tryFake = await scrapeFakeEmail();
    if (tryFake.ok) {
      return res.json({
        status: true,
        provider: tryFake.provider,
        email: tryFake.email,
        note: "This email is obtained by scraping fakeemail.net page. It may be ephemeral and scraping may break if site structure changes.",
        inboxUrl: `https://fakeemail.net/` // user can open site to see mailbox visually
      });
    }

    // fallback to 1secmail: we can generate random login + choose a domain from 1secmail list
    try {
      // request available domains from 1secmail
      const domainsRes = await axios.get(`${ONE_SEC_BASE}?action=getDomainList`, { timeout: 10000 });
      const domains = Array.isArray(domainsRes.data) && domainsRes.data.length ? domainsRes.data : ["1secmail.com"];
      // generate random login
      const login = `sayuki${Math.floor(Math.random() * 1000000)}`;
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const email = `${login}@${domain}`;
      return res.json({
        status: true,
        provider: "1secmail",
        email,
        note: "Fallback to 1secmail (recommended for programmatic inbox access). Use /api/temp-email/messages?email=... to fetch messages."
      });
    } catch (err) {
      // final fallback: simple random domain
      const email = `sayuki${Math.floor(Math.random()*100000)}@1secmail.com`;
      return res.json({
        status: true,
        provider: "1secmail-fallback",
        email,
        note: "Could not scrape fakeemail.net and could not fetch domain list; returning generated 1secmail address as fallback."
      });
    }
  });

  // Endpoint: get messages (tries 1secmail)
  app.get(`${prefix}/temp-email/messages`, async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ status: false, message: "Parameter 'email' required" });

    // Try 1secmail
    const r = await fetch1secMessages(email);
    if (r.ok) {
      return res.json({ status: true, provider: "1secmail", messages: r.messages });
    }

    // If 1secmail fails, just return helpful info and inbox UI URL for fakeemail.net
    return res.status(502).json({
      status: false,
      message: "Could not fetch messages via 1secmail. If you used fakeemail.net, open the inbox UI in a browser.",
      fakeemail_inbox_url: "https://fakeemail.net/"
    });
  });

  // Endpoint: read single message by id (1secmail)
  app.get(`${prefix}/temp-email/message`, async (req, res) => {
    const { email, id } = req.query;
    if (!email || !id) return res.status(400).json({ status: false, message: "Parameters 'email' and 'id' required" });

    const r = await fetch1secMessageById(email, id);
    if (r.ok) return res.json({ status: true, provider: "1secmail", message: r.message });

    return res.status(502).json({
      status: false,
      message: "Could not fetch message via 1secmail"
    });
  });

  // Utility: give direct UI inbox url for fakeemail.net (user can open in browser)
  app.get(`${prefix}/temp-email/inbox-url`, (req, res) => {
    const { email } = req.query;
    // fakeemail.net UI is not documented to accept email as param; provide base url and suggestion
    const info = {
      status: true,
      fakeemail_ui: "https://fakeemail.net/",
      note: "Open the link and either refresh or copy/paste the generated address on the site. fakeemail.net is client-side and may not support direct inbox via query parameter."
    };
    if (email) info.suggestedCommand = `Open ${info.fakeemail_ui} and paste ${email} into the address input (if available)`;
    return res.json(info);
  });

  // Optional: health check
  app.get(`${prefix}/temp-email/ping`, (req, res) => res.json({ status: true, ts: Date.now(), note: "temp-email service alive" }));
};
