# Ubuntu + UDA deployment

Roundabout Designer is currently a static HTML/CSS/JS site: no Node build or database required.

## Setup with existing UDA (preferred)

1. Add `zageabb/roundabout_designer` to the existing UDA application registry.
2. Point the web root at the checkout directory, serving `index.html`.
3. Keep the service bound to `127.0.0.1` and publish through the existing authenticated Caddy reverse proxy.
4. Assign a **new unused** port or configure Caddy to serve the checked-out folder directly; don't assume any existing port or domain.
5. Set the UDA main-branch update trigger to fetch this repository and publish the newest verified commit.
6. Use the existing deployment rollback strategy rather than modifying global Caddy or UDA logic.

If UDA needs an executable web process, run `PORT=<allocated-port> bash deploy/serve.sh`. This uses the Python standard library and binds to loopback.

The app uses no absolute API or asset URLs, so publishing under a path prefix is feasible. Verify asset and download handling through your proxy.

## Verification after registration

- Loading through the authenticated HTTPS URL shows the four approaches and editable 1–5 circulating lane setting.
- Left-hand approach placement and clockwise travel confirmed visually.
- SVG, PNG and JSON export/download work through the proxy.
- GitHub main update triggers UDA; commit visible in the served version.
- Rollback to previous commit works.
- No unauthenticated direct public listener.

**Deployment status**: repository prepared only. Live Ubuntu UDA/Caddy registration was not performed from ChatGPT and must be checked on the server.
