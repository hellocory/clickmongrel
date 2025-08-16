# Weekly Report - Week of {{week_start}}

## Goal Progress
- **Current Goal**: {{goal_title}}
- **Overall Progress**: {{goal_progress}}%
- **This Week's Progress**: {{week_progress}}%

## Key Accomplishments
{{#completed_tasks}}
- {{title}} ({{time_tracked}})
{{/completed_tasks}}

## Active Development
{{#in_progress_tasks}}
- {{title}} - {{progress}}%
{{/in_progress_tasks}}

## Commits This Week
{{#commits}}
- {{message}} ({{hash}})
{{/commits}}

## Next Week's Priorities
{{#next_week_tasks}}
- {{title}}
{{/next_week_tasks}}

## Challenges & Blockers
{{#blockers}}
- {{.}}
{{/blockers}}

## Notes
{{notes}}
