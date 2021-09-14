import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, externalSchematic } from '@angular-devkit/schematics';
/**
 * We are able to use the full, unaltered Schema directly from @schematics/angular
 * The applicable json file is copied from node_modules as a prebuiid step to ensure
 * they stay in sync.
 */
import type { Schema } from '@schematics/angular/application/schema';
import {
  addJestTargetToProject,
  createJestConfigForProject,
  removeKarmaConfJsForProject,
} from '../utils';

function jestRelatedChanges(options: Schema) {
  return chain([
    // Update the lint builder and config in angular.json
    addJestTargetToProject(options.name, 'test'),
    // Create the Jest config file for the project
    createJestConfigForProject(options.name),
    // Delete the Karma config file for the project
    removeKarmaConfJsForProject(options.name),
  ]);
}

export default function (options: Schema): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      externalSchematic('@schematics/angular', 'application', options),
      jestRelatedChanges(options),
    ])(host, context);
  };
}
