exports.default = async function (context) {
  const { appOutDir, electronPlatformName } = context;
  if (electronPlatformName !== "linux") return;

  const path = require("node:path");
  const fs = require("node:fs");

  const productFilename = context.packager.appInfo.productFilename;
  const appRunPath = path.join(appOutDir, "AppRun");

  const newAppRun = `#!/bin/bash
set -e
APPDIR="$(dirname "$(readlink -f "$0")")"
export PATH="\${APPDIR}:\${APPDIR}/usr/sbin:\${PATH}"
export LD_LIBRARY_PATH="\${APPDIR}/usr/lib:\${LD_LIBRARY_PATH}"
export XDG_DATA_DIRS="\${APPDIR}"/usr/share/:"\${XDG_DATA_DIRS}":/usr/share/gnome/:/usr/local/share/:/usr/share/
exec "\${APPDIR}/${productFilename}" --ozone-platform=x11 "$@"
`;

  fs.writeFileSync(appRunPath, newAppRun, { mode: 0o755 });
};
