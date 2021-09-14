var fs = require('fs-extra');

const sources = ['LICENSE', 'package-lock.json', 'package.json', 'README.md'];

for (const source of sources) {
  fs.copyFileSync(source, `dist/${source}`);
}

const sourcesInSrc = [
  'collection.json',
  'files',
  'add-jest/schema.json',
  'application/schema.json',
  'library/schema.json',
  'ng-add/schema.json',
  'remove-karma/schema.json',
];

for (const source of sourcesInSrc) {
  fs.copySync(`src/${source}`, `dist/${source}`);
}
