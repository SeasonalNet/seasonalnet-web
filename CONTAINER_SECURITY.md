# Container security and launch contract

The Dockerfile defaults to a non-root service user. Application code, runtime
libraries, and executables are owned by root; only designated state/cache
paths are service-owned. Configuration and secrets must be supplied at runtime.

The checked-in Compose definition applies a read-only root filesystem, drops
all Linux capabilities, enables `no-new-privileges`, and supplies a writable
`/tmp` with `noexec,nosuid,nodev`. It retains Docker's default seccomp profile
and network namespace. Do not launch with privileged mode, host namespaces,
unconfined security profiles, or a Docker socket mount.

These runtime restrictions are applied when creating the container; building
or running the image alone does not enforce them. Writable data and readable
credentials remain accessible to the service if it is compromised. `noexec`
on temporary storage does not prevent an interpreter from reading scripts.
CPU, memory, and process limits are deployment policies and are intentionally
not specified here; they do not establish the application's authority boundary.

Apply the definition during the separately authorized deployment. Existing
containers are not changed by editing these files. Preserve existing site-local
configuration, credentials, proxy integration, and persistent data when adopting
it. An existing volume or bind mount must already be writable by the documented
service UID/GID; rebuilding does not change existing volume ownership.

## Service configuration

Use `APP=www docker compose build` and `APP=www docker compose up -d` for
one app, selecting a distinct Compose project (`-p`) and `PUBLISH_PORT` for each
SPA. The default host binding is loopback. UID/GID is `10001:10001`; the only
persistent writable path is `/app/apps/<app>/.next/cache`. Inject site-specific
environment settings and mount provisioning assets read-only as required. The
image's app selection must match `APP` in Compose.

## Minimal production runtime

Production images contain no shell, package manager, compiler, or download CLI.
Startup and healthchecks use executable/argument arrays. Builder and operator
stages may contain tools; those stages are not the production runtime. The
read-only filesystem, dropped capabilities, and privilege restrictions in
Compose remain required. Interpreter APIs, accessible credentials, shared
libraries, and allowed network connections remain part of the attack surface.
No outbound network restriction is implied by this image change.

After building the production image, check its actual exported filesystem:

```sh
python3 tools/container/check-image.py IMAGE
```

The checker runs outside the application image. It rejects shell-based
healthchecks, root execution, common utility binaries, unexpected executable
ELF payloads, non-root-owned application files, and selected non-service files.
It prints the image ID and executable/library inventory for review. It does not
claim that retained libraries are vulnerability-free or that every reachable
interpreter operation is safe.

The production base is digest-pinned distroless Node 22. The previous Debian
Node image remains a build/assembly input. Native addons and TLS behavior must
be tested in the final runtime after base updates.

Unit-test the inventory gate with `python3 -m unittest discover -s
tools/container -p 'test_*.py'`. The native runtime repositories include
additional dependency-discovery and runtime-exclusion tests.

## Validation (2026-10-21)

`make quality` passed with 171 application/tooling tests and unchanged coverage
ceilings. All seven SPA variants were built and passed final-image inventory,
startup/health, and native image-optimization checks. `make container-check`
builds the selected APP, runs the inventory-gate unit tests, and checks the
exported release filesystem. Node moved from 22.23.3 to 22.23.4 with the pinned
distroless base; native runtime behavior and outbound TLS were exercised.

The final production filesystem passed the exported-image security gate. Its
negative unit tests passed (8 tests, plus 5 assembler tests for native images).
Node/Python runtime probes verified non-root execution, a read-only root,
zero effective capabilities, NoNewPrivs=1, seccomp filtering, and writable
temporary storage. State tests used disposable mounts, not production volumes.
No image build or test constitutes a deployment. No deployment was performed.

Local unpacked image size: 385.9 MiB before minimization,
277.0 MiB after. Size reduction is descriptive; the security
properties are the retained authority and executable contents.

## Functional image validation (2026-10-21)

Run `python3 tools/container/functional-check.py TAG` after building all seven
`seasonalnet-web-APP:TAG` images. The checker runs the actual launch module in
network-isolated containers with local fixture HTTP services. All seven passed:
rendered public/login/docs HTML, every referenced Next static asset (12-17 URLs
per app), OpenAPI responses or expected auth redirects, mock announcement
responses on public endpoints, session/CSRF handling, protected-route redirects,
radio metadata, and native optimized-image requests. The protected admin and
agent APIs were checked for denial, not authenticated operator operations.
This is HTTP integration validation; it does not execute browser JavaScript,
complete an OIDC login, or exercise interactive browser workflows.
The Python runner invokes `functional.mjs`, which is explicitly declared as a
program entry in Knip; no quality rule or coverage threshold was weakened.

These checks use non-root containers, a read-only root filesystem, all
capabilities dropped, `no-new-privileges`, and disposable writable temporary
storage. No shell or test framework was installed into a production image.
Passing these paths is evidence of runtime compatibility, not exhaustive
workflow or production acceptance. No deployment was performed.
