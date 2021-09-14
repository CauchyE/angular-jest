import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, schematic } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { getTargetsConfigFromProject, readJsonInTree, sortObjectByKeys } from '../utils/';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require('../../package.json');

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

function applyJestConfigIfSingleProjectWithNoExistingKarma() {
  return (host: Tree, context: SchematicContext) => {
    const angularJson = readJsonInTree(host, 'angular.json');
    if (!angularJson || !angularJson.projects) {
      return;
    }
    // Anything other than a single project, finish here as there is nothing more we can do automatically
    const projectNames = Object.keys(angularJson.projects);
    if (projectNames.length !== 1) {
      return;
    }

    const singleProject = angularJson.projects[projectNames[0]];
    const targetsConfig = getTargetsConfigFromProject(singleProject);
    // Only possible if malformed, safer to finish here
    if (!targetsConfig) {
      return;
    }

    // The project already has a lint builder setup, finish here as there is nothing more we can do automatically
    if (targetsConfig.lint) {
      return;
    }

    context.logger.info(`
We detected that you have a single project in your workspace and no existing linter wired up, so we are configuring Jest for you automatically.
Please see https://github.com/CauchyE/angular-jest for more information.
`);

    return chain([schematic('add-jest-to-project', {})]);
  };
}

export default function (): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([addAngularJestPackages(), applyJestConfigIfSingleProjectWithNoExistingKarma()])(
      host,
      context,
    );
  };
}
