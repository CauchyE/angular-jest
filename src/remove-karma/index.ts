import type { Rule, Tree } from '@angular-devkit/schematics';
import { chain } from '@angular-devkit/schematics';
import {
  determineTargetProjectName,
  isKarmaUsedInWorkspace,
  removeKarmaConfJsForProject,
} from '../utils';
import type { Schema } from './schema';
import { uninstallKarmaAndJasmine } from './utils';

export default function removeKarma(schema: Schema): Rule {
  return (tree: Tree) => {
    const projectName = determineTargetProjectName(tree, schema.project);
    if (!projectName) {
      throw new Error(
        '\n' +
          `
Error: You must specify a project to convert because you have multiple projects in your angular.json
E.g. npx ng g @angular-jest/schematics:remove-karma {{YOUR_PROJECT_NAME_GOES_HERE}}
        `.trim(),
      );
    }

    return chain([
      removeKarmaConfJsForProject(projectName),

      function cleanUpKarmaIfNoLongerInUse(tree) {
        if (schema.removeKarmaIfNoMoreKarmaTargets && !isKarmaUsedInWorkspace(tree)) {
          return chain([uninstallKarmaAndJasmine()]);
        }
        return undefined;
      },
    ]);
  };
}
