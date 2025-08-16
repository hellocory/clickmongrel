# Daily Report - {{date}}

## Goal: {{goal_title}}
**Progress**: {{goal_progress}}%

## Completed Today
{{#completed_tasks}}
- [ ] **{{title}}** ({{time_tracked}})
  {{#commits}}
  - Commit: {{.}}
  {{/commits}}
{{/completed_tasks}}

## In Progress
{{#in_progress_tasks}}
- [ ] **{{title}}**
  {{#blockers}}
  - Blocker: {{.}}
  {{/blockers}}
{{/in_progress_tasks}}

## Tomorrow's Focus
{{#tomorrow_tasks}}
- [ ] {{title}}
{{/tomorrow_tasks}}

## Notes
{{notes}}
