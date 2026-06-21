## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `username` | `text` |  Unique |
| `display_name` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `user_stats`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `total_solved` | `int4` |  Nullable |
| `total_exams_attempted` | `int4` |  Nullable |
| `passed_exams_count` | `int4` |  Nullable |
| `average_sum` | `int4` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `cbt_progress`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `user_id` | `uuid` |  Nullable |
| `subject` | `text` |  |
| `round_key` | `text` |  |
| `score` | `int4` |  Nullable |
| `total` | `int4` |  Nullable |
| `percent` | `int4` |  Nullable |
| `time_seconds` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `user_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `user_id` | `uuid` |  Nullable |
| `event_type` | `text` |  Nullable |
| `message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `legacy_username` | `text` |  Nullable |

## Table `user_logs_backup`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `event_type` | `text` |  Nullable |
| `message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `legacy_username` | `text` |  Nullable |

