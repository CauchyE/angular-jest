import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, schematic } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { readJsonInTree, sortObjectByKeys } from '../utils/';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require('../package.json');

function addAngularJestPackages() {
  return (host: Tree, context: SchematicContext) => {
    if (!host.exists('package.json')) {
      throw new Error('Could not find a `package.json` file at the root of your workspace');
    }

    const projectPackageJSON = (host.read('package.json') as Buffer).toString('utf-8');
    const json = JSON.parse(projectPackageJSON);
    json.devDependencies = json.devDependencies || {};
    json.devDependencies['jest'] = packageJSON.devDependencies['jest'];
    json.devDependencies['@types/jest'] = packageJSON.devDependencies['@types/jest'];
    json.devDependencies['@angular-builders/jest'] =
      packageJSON.devDependencies['@angular-builders/jest'];
    json.devDependencies['jest-preset-angular'] =
      packageJSON.devDependencies['jest-preset-angular'];

    json.scripts = json.scripts || {};
    json.scripts['test'] = json.scripts['test'] || 'ng test';

    /**
     * It seems in certain versions of Angular CLI `ng add` will automatically add the
     * @angular-jest/schematics package to the dependencies section, so clean that up
     * at this point
     */
    if (json.dependencies?.['@angular-jest/schematics']) {
      delete json.dependencies['@angular-jest/schematics'];
    }
    json.devDependencies['@angular-jest/schematics'] = packageJSON.version;

    json.devDependencies = sortObjectByKeys(json.devDependencies);
    host.overwrite('package.json', JSON.stringify(json, null, 2));

    context.addTask(new NodePackageInstallTask());

    context.logger.info(`
All @angular-jest dependencies have been successfully installed 🎉
Please see https://github.com/CauchyE/angular-jest for how to add Jest configuration to your project.
`);

    return host;
  };
}

function applyJestConfigForDefaultProject() {
  return (host: Tree, _: SchematicContext) => {
    const angularJson = readJsonInTree(host, 'angular.json');
    if (!angularJson || !angularJson.projects) {
      return;
    }
    const projectNames = Object.keys(angularJson.projects);
    if (projectNames.length === 0) {
      return;
    }

    const defaultProject = angularJson.defaultProject;
    if (!defaultProject) {
      return;
    }

    return chain([schematic('add-jest', {})]);
  };
}

export default function (): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([addAngularJestPackages(), applyJestConfigForDefaultProject()])(host, context);
  };
}
