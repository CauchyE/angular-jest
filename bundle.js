var fs = require('fs-extra')

const sources = ['LICENSE', 'package-lock.json', 'package.json', 'README.md'];

for (const source of sources) {
  fs.copyFileSync(source, `dist/${source}`);
}

const sourcesInSrc = ['collection.json', 'files'];

for (const source of sourcesInSrc) {
  fs.copySync(`src/${source}`, `dist/${source}`);
}
