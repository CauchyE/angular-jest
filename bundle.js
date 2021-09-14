var fs = require('fs-extra');

const sources = ['LICENSE', 'package-lock.json', 'package.json', 'README.md'];

for (const source of sources) {
  fs.copyFileSync(source, `dist/${source}`);
}

const sourcesInSrc = [
  'collection.json',
  'files',
  'add-jest-to-project/schema.json',
  'application/schema.json',
  'convert-karma-to-jest/schema.json',
  'library/schema.json',
  'ng-add/schema.json',
];

for (const source of sourcesInSrc) {
  fs.copySync(`src/${source}`, `dist/${source}`);
}
