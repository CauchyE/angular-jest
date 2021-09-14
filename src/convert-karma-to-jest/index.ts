import { join, normalize } from '@angular-devkit/core';
import type { Rule, Tree } from '@angular-devkit/schematics';
import { chain, noop } from '@angular-devkit/schematics';
import {
  addJestTargetToProject,
  createJestConfigForProject,
  determineTargetProjectName,
  getProjectConfig,
  isKarmaUsedInWorkspace,
  removeKarmaConfJsForProject,
} from '../utils';
import type { Schema } from './schema';
import { uninstallKarmaAndJasmine } from './utils';

export default function convert(schema: Schema): Rule {
  return (tree: Tree) => {
    const projectName = determineTargetProjectName(tree, schema.project);
    if (!projectName) {
      throw new Error(
        '\n' +
          `
Error: You must specify a project to convert because you have multiple projects in your angular.json
E.g. npx ng g @angular-jest/schematics:convert-karma-to-jest {{YOUR_PROJECT_NAME_GOES_HERE}}
        `.trim(),
      );
    }

    const { root: projectRoot } = getProjectConfig(tree, projectName);

    // Default Angular CLI project at the root of the workspace
    const isRootAngularProject: boolean = projectRoot === '';

    return chain([
      // Overwrite the "lint" target directly for the selected project in the angular.json
      addJestTargetToProject(projectName, 'test'),

      isRootAngularProject
        ? noop()
        : chain([
            // Create the latest recommended Jest config file for the project
            createJestConfigForProject(projectName),
            // Delete the Karma config file for the project
            removeKarmaConfJsForProject(projectName),
          ]),
      function cleanUpKarmaIfNoLongerInUse(tree) {
        if (schema.removeKarmaIfNoMoreKarmaTargets && !isKarmaUsedInWorkspace(tree)) {
          tree.delete(join(normalize(tree.root.path), 'karma.conf.js'));
          return chain([uninstallKarmaAndJasmine()]);
        }
        return undefined;
      },
    ]);
  };
}
