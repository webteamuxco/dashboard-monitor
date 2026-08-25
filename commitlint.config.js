/**
 * Convention de commits — Conventional Commits.
 * Format attendu :  type(scope): sujet
 *   ex. feat(TW-179): ajout du hello-bar plein écran
 *       fix(TW-181): tracking manquant dans le DTO
 *
 * Le scope est optionnel mais, quand il existe, on encourage le ticket Jira (TW-xxx).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Types autorisés — alignés sur ce que git-cliff sait regrouper (cf. cliff.toml)
    'type-enum': [
      2,
      'always',
      [
        'feat', // nouvelle fonctionnalité
        'fix', // correction de bug
        'perf', // amélioration de perf
        'refactor', // refacto sans changement de comportement
        'docs', // documentation
        'style', // formatage, sans impact code
        'test', // ajout/màj de tests
        'build', // build system, deps
        'ci', // pipelines Bitbucket
        'chore', // maintenance diverse
        'revert', // revert d'un commit
        'monitor', // evols de monitoring
        'chat', // Chatbot
      ],
    ],
    'subject-case': [0], // on n'impose pas la casse du sujet (FR/EN mélangés)
    'body-max-line-length': [0], // pas de limite stricte sur le corps
  },
};
