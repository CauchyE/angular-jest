/**
 * Some utils taken from various parts of Nx:
 * https://github.com/nrwl/nx
 *
 * Thanks, Nrwl folks!
 */
import { Path, strings } from '@angular-devkit/core';
import { join, normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  url,
} from '@angular-devkit/schematics';
import { callRule } from '@angular-devkit/schematics';
import type { Ignore } from 'ignore';
import ignore from 'ignore';
import stripJsonComments from 'strip-json-comments';

/**
 * This method is specifically for reading JSON files in a Tree
 * @param host The host tree
 * @param path The path to the JSON file
 * @returns The JSON data in the file.
 */
// eslint-disable-next-line @typescript-jest/no-explicit-any
export function readJsonInTree<T = any>(host: Tree, path: string): T {
  if (!host.exists(path)) {
    throw new Error(`Cannot find ${path}`);
  }
  const contents = stripJsonComments((host.read(path) as Buffer).toString('utf-8'));
  try {
    return JSON.parse(contents);
  } catch (e) {
    throw new Error(`Cannot parse ${path}: ${e.message}`);
  }
}

/**
 * This method is specifically for updating JSON in a Tree
 * @param path Path of JSON file in the Tree
 * @param callback Manipulation of the JSON data
 * @returns A rule which updates a JSON file file in a Tree
 */
// eslint-disable-next-line @typescript-jest/no-explicit-any
export function updateJsonInTree<T = any, O = T>(
  path: string,
  callback: (json: T, context: SchematicContext) => O,
): Rule {
  return (host: Tree, context: SchematicContext): Tree => {
    if (!host.exists(path)) {
      host.create(path, serializeJson(callback({} as T, context)));
      return host;
    }
    host.overwrite(path, serializeJson(callback(readJsonInTree(host, path), context)));
    return host;
  };
}

// eslint-disable-next-line @typescript-jest/explicit-module-boundary-types
export function getWorkspacePath(host: Tree) {
  const possibleFiles = ['/workspace.json', '/angular.json'];
  return possibleFiles.filter((path) => host.exists(path))[0];
}

type TargetsConfig = Record<string, { builder: string; options: unknown }>;

export function getTargetsConfigFromProject(
  projectConfig: { architect?: TargetsConfig } & { targets?: TargetsConfig },
): TargetsConfig | null {
  if (!projectConfig) {
    return null;
  }
  if (projectConfig.architect) {
    return projectConfig.architect;
  }
  // "targets" is an undocumented but supported alias of "architect"
  if (projectConfig.targets) {
    return projectConfig.targets;
  }
  return null;
}

export function isKarmaUsedInWorkspace(tree: Tree): boolean {
  const workspaceJson = readJsonInTree(tree, getWorkspacePath(tree));
  if (!workspaceJson) {
    return false;
  }

  for (const [, projectConfig] of Object.entries(
    workspaceJson.projects,
    // eslint-disable-next-line @typescript-jest/no-explicit-any
  ) as any) {
    const targetsConfig = getTargetsConfigFromProject(projectConfig);
    if (!targetsConfig) {
      continue;
    }

    for (const [, targetConfig] of Object.entries(targetsConfig)) {
      if (!targetConfig) {
        continue;
      }

      if (targetConfig.builder === '@angular-devkit/build-angular:karma') {
        // Workspace is still using Karma, exit early
        return true;
      }

      if (targetConfig.builder === '@angular-builders/custom-webpack:karma') {
        return true;
      }
    }
  }
  // If we got this far the user has no remaining Karma usage
  return false;
}

// eslint-disable-next-line @typescript-jest/no-explicit-any
export function getProjectConfig(host: Tree, name: string): any {
  const workspaceJson = readJsonInTree(host, getWorkspacePath(host));
  const projectConfig = workspaceJson.projects[name];
  if (!projectConfig) {
    throw new Error(`Cannot find project '${name}'`);
  } else {
    return projectConfig;
  }
}

export function offsetFromRoot(fullPathToSourceDir: string): string {
  const parts = normalize(fullPathToSourceDir).split('/');
  let offset = '';
  for (let i = 0; i < parts.length; ++i) {
    offset += '../';
  }
  return offset;
}

function serializeJson(json: unknown): string {
  return `${JSON.stringify(json, null, 2)}\n`;
}

// eslint-disable-next-line @typescript-jest/no-explicit-any
export function updateWorkspaceInTree<T = any, O = T>(
  callback: (json: T, context: SchematicContext, host: Tree) => O,
): Rule {
  return (host: Tree, context: SchematicContext): Tree => {
    const path = getWorkspacePath(host);
    host.overwrite(path, serializeJson(callback(readJsonInTree(host, path), context, host)));
    return host;
  };
}

export function addJestTargetToProject(projectName: string, targetName: 'test'): Rule {
  return updateWorkspaceInTree((workspaceJson) => {
    const existingProjectConfig = workspaceJson.projects[projectName];
    const { root: projectRoot } = workspaceJson.projects[projectName];
    const configPath = join(normalize(projectRoot || ''), 'jest.config.js');

    const jestTargetConfig = {
      builder: '@angular-builders/jest:run',
      options: {
        configPath,
      },
    };

    existingProjectConfig.architect[targetName] = jestTargetConfig;

    return workspaceJson;
  });
}

/**
 * Utility to act on all files in a tree that are not ignored by git.
 */
export function visitNotIgnoredFiles(
  visitor: (file: Path, host: Tree, context: SchematicContext) => void | Rule,
  dir: Path = normalize(''),
): Rule {
  return (host, context) => {
    let ig: Ignore;
    if (host.exists('.gitignore')) {
      ig = ignore();
      ig.add((host.read('.gitignore') as Buffer).toString());
    }

    function visit(_dir: Path) {
      if (_dir && ig?.ignores(_dir)) {
        return;
      }
      const dirEntry = host.getDir(_dir);
      dirEntry.subfiles.forEach((file) => {
        if (ig?.ignores(join(_dir, file))) {
          return;
        }
        const maybeRule = visitor(join(_dir, file), host, context);
        if (maybeRule) {
          callRule(maybeRule, host, context).subscribe();
        }
      });

      dirEntry.subdirs.forEach((subdir) => {
        visit(join(_dir, subdir));
      });
    }

    visit(dir);
  };
}

// eslint-disable-next-line @typescript-jest/explicit-module-boundary-types
export function createRootJestConfig(path: string, hasE2e: boolean) {
  return createProjectJestConfig(path, '', '', hasE2e);
}

function createProjectJestConfig(
  path: string,
  projectRoot: string,
  projectName: string,
  hasE2e: boolean,
) {
  return async (tree: Tree) => {
    const tsconfigPath = join(normalize(projectRoot || '/'), 'tsconfig.spec.json');
    const projectTSConfigJSON = (tree.read(tsconfigPath) as Buffer).toString('utf-8');
    const tsconfigReplaced = projectTSConfigJSON
      .replace(`"jasmine"`, `"jest"`)
      .replace(`"src/test.ts"`, `"src/setup-jest.ts"`);

    tree.overwrite(tsconfigPath, tsconfigReplaced);

    const tsconfigLibPath = join(normalize(projectRoot || '/'), 'tsconfig.lib.json');
    if (tree.exists(tsconfigLibPath)) {
      const projectTSConfigLibJSON = (tree.read(tsconfigLibPath) as Buffer).toString('utf-8');
      const tsconfigLibReplaced = projectTSConfigLibJSON.replace(
        `"src/test.ts"`,
        `"src/setup-jest.ts"`,
      );
      tree.overwrite(tsconfigLibPath, tsconfigLibReplaced);
    }

    const templateSource = apply(url('../files'), [
      applyTemplates({
        ...strings,
        projectRoot,
        projectName,
        hasE2e,
      }),
      move(path),
    ]);

    return chain([mergeWith(templateSource)]);
  };
}

export function createJestConfigForProject(projectName: string): Rule {
  return (tree: Tree) => {
    const angularJSON = readJsonInTree(tree, 'angular.json');
    const { root: projectRoot } = angularJSON.projects[projectName];

    const hasE2e = determineTargetProjectHasE2E(angularJSON, projectName);

    /**
     * If the root is an empty string it must be the initial project created at the
     * root by the Angular CLI's workspace schematic
     */
    if (projectRoot === '') {
      return createRootJestConfigFile(projectName);
    }
    return createProjectJestConfig(normalize(projectRoot), projectRoot, projectName, hasE2e);
  };
}

export function removeKarmaConfJsForProject(projectName: string): Rule {
  return (tree: Tree) => {
    const angularJSON = readJsonInTree(tree, 'angular.json');
    const { root: projectRoot } = angularJSON.projects[projectName];

    const karmaJsonPath = join(normalize(projectRoot || '/'), 'karma.conf.js');
    if (tree.exists(karmaJsonPath)) {
      tree.delete(karmaJsonPath);
    }
    const testTsPath = join(normalize(projectRoot || '/'), 'src/test.ts');
    if (tree.exists(testTsPath)) {
      tree.delete(testTsPath);
    }
  };
}

function createRootJestConfigFile(projectName: string): Rule {
  return (tree) => {
    const angularJSON = readJsonInTree(tree, getWorkspacePath(tree));
    const { root: projectRoot } = angularJSON.projects[projectName];
    const hasE2e = determineTargetProjectHasE2E(angularJSON, projectName);

    return createRootJestConfig(normalize(projectRoot), hasE2e);
  };
}

export function sortObjectByKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      return {
        ...result,
        [key]: obj[key],
      };
    }, {});
}

/**
 * To make certain schematic usage conversion more ergonomic, if the user does not specify a project
 * and only has a single project in their angular.json we will just go ahead and use that one.
 */
export function determineTargetProjectName(tree: Tree, maybeProject?: string): string | null {
  if (maybeProject) {
    return maybeProject;
  }
  const workspaceJson = readJsonInTree(tree, getWorkspacePath(tree));
  const projects = Object.keys(workspaceJson.projects);
  if (projects.length === 1) {
    return projects[0];
  }
  return null;
}

/**
 * Checking if the target project has e2e setup
 * Method will check if angular project architect has e2e configuration to determine if e2e setup
 */
export function determineTargetProjectHasE2E(
  // eslint-disable-next-line @typescript-jest/explicit-module-boundary-types, @typescript-jest/no-explicit-any
  angularJSON: any,
  projectName: string,
): boolean {
  return !!getTargetsConfigFromProject(angularJSON.projects[projectName])?.e2e;
}
