import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { sortObjectByKeys } from '../utils';

export function uninstallKarmaAndJasmine(): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!host.exists('package.json')) {
      throw new Error('Could not find a `package.json` file at the root of your workspace');
    }

    const projectPackageJSON = (host.read('package.json') as Buffer).toString('utf-8');
    const json = JSON.parse(projectPackageJSON);

    if (json.devDependencies) {
      delete json.devDependencies['@types/jasmine'];
      delete json.devDependencies['@types/jasminewd2'];
      delete json.devDependencies['jasmine-core'];
      delete json.devDependencies['jasmine-spec-reporter'];
      delete json.devDependencies['karma'];
      delete json.devDependencies['karma-chrome-launcher'];
      delete json.devDependencies['karma-coverage-istanbul-reporter'];
      delete json.devDependencies['karma-jasmine'];
      delete json.devDependencies['karma-jasmine-html-reporter'];
      json.devDependencies = sortObjectByKeys(json.devDependencies);
    }

    if (json.dependencies) {
      delete json.dependencies['@types/jasmine'];
      delete json.dependencies['@types/jasminewd2'];
      delete json.dependencies['jasmine-core'];
      delete json.dependencies['jasmine-spec-reporter'];
      delete json.dependencies['karma'];
      delete json.dependencies['karma-chrome-launcher'];
      delete json.dependencies['karma-coverage-istanbul-reporter'];
      delete json.dependencies['karma-jasmine'];
      delete json.dependencies['karma-jasmine-html-reporter'];
      json.dependencies = sortObjectByKeys(json.dependencies);
    }

    host.overwrite('package.json', JSON.stringify(json, null, 2));
    context.addTask(new NodePackageInstallTask());

    return host;
  };
}
