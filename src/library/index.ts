import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, externalSchematic } from '@angular-devkit/schematics';
/**
 * We are able to use the full, unaltered Schema directly from @schematics/angular
 * The applicable json file is copied from node_modules as a prebuiid step to ensure
 * they stay in sync.
 */
import type { Schema } from '@schematics/angular/library/schema';
import {
  addJestTargetToProject,
  createJestConfigForProject,
  removeKarmaConfJsForProject,
} from '../utils';

function jestRelatedChanges(options: Schema) {
  /**
   * The types coming from the @schematics/angular schema seem to be wrong, if name isn't
   * provided the interactive CLI prompt will throw
   */
  const projectName = options.name as string;
  return chain([
    // Update the lint builder and config in angular.json
    addJestTargetToProject(projectName, 'test'),
    // Create the Jest config file for the project
    createJestConfigForProject(projectName),
    // Delete the Karma config file for the project
    removeKarmaConfJsForProject(projectName),
  ]);
}

export default function (options: Schema): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      externalSchematic('@schematics/angular', 'library', options),
      jestRelatedChanges(options),
    ])(host, context);
  };
}
