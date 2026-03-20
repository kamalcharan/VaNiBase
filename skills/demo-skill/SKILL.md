# demo-skill

**Version:** 0.1.0
**Tier:** starter
**Description:** Demo skill for end-to-end pipeline testing. Not a real product skill.

## Functions

### get_greeting
Returns a personalized greeting with the tenant name.

**Parameters:**
| Name | Type   | Required | Description              |
|------|--------|----------|--------------------------|
| name | string | true     | Name of person to greet  |

**Returns:** `{ message, tenant_name, timestamp }` with recipe `demo-dashboard`

### get_stats
Returns framework runtime stats (skill count, uptime).

**Parameters:** None

**Returns:** `{ tenant_name, skill_count, uptime_seconds }` with recipe `demo-dashboard`
