import type { Rule, Tree } from '@angular-devkit/schematics';
import { chain } from '@angular-devkit/schematics';
import {
  addJestTargetToProject,
  createJestConfigForProject,
  determineTargetProjectName,
} from '../utils';

interface Schema {
  project?: string;
}

export default function addJestToProject(schema: Schema): Rule {
  return (tree: Tree) => {
    const projectName = determineTargetProjectName(tree, schema.project);
    if (!projectName) {
      throw new Error(
        '\n' +
          `
Error: You must specify a project to add Jest to because you have multiple projects in your angular.json
E.g. npx ng g @angular-jest/schematics:add-jest-to-project {{YOUR_PROJECT_NAME_GOES_HERE}}
        `.trim(),
      );
    }
    return chain([
      // Set the test builder and config in angular.json
      addJestTargetToProject(projectName, 'test'),
      // Create the Jest config file for the project
      createJestConfigForProject(projectName),
    ]);
  };
}
