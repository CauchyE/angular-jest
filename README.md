# `@angular-jest/schematics`

This is a module for `@schematics/angular` to configure for using `@angular-builder/jest` automatically.

## Install

This command make the workspace install dependencies related with Jest.
Furthermore, if the workspace has a default project, it make the project configured to use Jest.

```bash
ng add @angular-jest/schematics
```

### Remove Karma in already existing project

After Jest installation, if you want to remove Karma and its related configurations, use this command.
Optionally, you can also remove dependencies related with Karma and Jasmine.

```bash
ng g @angular-jest/schematics:remove-karma {{YOUR_PROJECT_NAME_GOES_HERE}}
```

### Add Jest in already existing project

If you use multi projects workspace, you can add Jest setup to each project.

```bash
ng g @angular-jest/schematics:add-jest {{YOUR_PROJECT_NAME_GOES_HERE}}
```

#### Only one needed action manually

`tsconfig.spec.json`

```json
"esModuleInterop": true
```
