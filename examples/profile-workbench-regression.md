# Profile Workbench Regression Example

This example captures the Zeni dogfood failure that motivated Handoff-First
Linear Workflow v2.

The important regression is not "a heading changed." The regression is an agent
turning shaped discovery into implementation without first producing clean
Linear source-of-truth artifacts.

## Failure Captured

The bad path looked plausible in the moment:

1. `linear-idea` captured a real product improvement.
2. `/office-hours` shaped the product direction.
3. The agent produced PRD, Tech Spec, and Issue-like content.
4. The Project moved toward Delivery too early.
5. Linear-facing bodies leaked workflow language such as lifecycle notes,
   active-doc lists, skill names, and readiness instructions.
6. Implementation could begin from a local plan instead of an approved Linear
   Issue.

The fix is stronger artifact construction, not more template bureaucracy.

## Expected Lifecycle

- Project starts in Idea after `linear-idea`.
- Project moves to Discovery when PRD and Tech Spec are created.
- Project remains Discovery after PRD and Tech Spec creation.
- `linear-handoff` packages Project, PRD, Tech Spec, and proposed Issue slicing
  for user approval.
- Delivery starts through `linear-implement` and requires an approved execution
  Issue plus explicit implementation-start approval.
- Implementation starts from the approved Issue, not from `/office-hours`,
  `/brainstorming`, PRD, Tech Spec, or a local review plan.
- Local branch readiness is proven by `linear-preflight` before `linear-ship`
  owns formal pre-ship review/check and PR lifecycle.

## Good Project Fragment

The Project is a product brief, not a workflow dashboard.

```markdown
# Что

Переработать Settings > Profile в Profile Workbench для контекста Альфреда:
три независимых save-блока, Goals через Add goal modal, Yield targets как
честная platform + optional asset поверхность.

# Зачем

Оператор сейчас откладывает правки профиля, потому экран выглядит как одна
большая risky form. Профиль должен снова стать местом, которое спокойно
поддерживается вручную.

# Образ результата

Оператор меняет один участок контекста и понимает, что именно будет сохранено.
Goals читаются как список, создание вынесено в modal, Yield targets не
притворяются account-level настройкой.

# Что входит

- Split saves для Identity & phase, Voice & guardrails, Context.
- Goals list-first UI и Add goal modal.
- Yield targets list-first UI с platform/asset wording.

# Что не входит

- Account-level или institution-level yield target schema.
- Goal lifecycle beyond create/remove.
- Перенос контекста в Settings > Agent.
```

## Good PRD Fragment

The PRD answers WHAT and gives stable requirement anchors.

```markdown
## Требования

**Безопасное редактирование profile**
- R1. Блоки Identity & phase, Voice & guardrails и Context визуально и
  поведенчески являются отдельными save-поверхностями.
- R2. Сохранение одного profile-блока не отправляет unrelated fields из других
  блоков как null или empty updates.
- R3. У каждого profile-блока есть descriptive save copy: Save identity,
  Save voice, Save context.

**Goals**
- R4. Goals отображаются как list-first поверхность.
- R5. Создание goal открывается через Add goal и не находится inline под
  списком.

**Yield targets**
- R6. Yield targets отображаются как platform + optional asset expectations.
- R7. Yield target copy не подразумевает account-level или institution-level
  binding.

## Примеры приемки

- AE1. Покрывает R1, R2, R3. Дано: existing profile с заполненными voice и
  context fields. Когда оператор редактирует Identity & phase и нажимает Save
  identity, тогда отправляются только identity-owned fields, а остальные
  profile fields остаются без изменений.
- AE2. Покрывает R4, R5. Дано: Goals card видима. Когда оператор нажимает Add
  goal, тогда открывается modal с существующими create fields, а inline create
  form под списком отсутствует.
- AE3. Покрывает R6, R7. Дано: Yield targets показаны. Когда target не имеет
  asset, тогда UI описывает его как применимый ко всем assets на platform и не
  использует account, institution или linked-account wording.

## Критерии успеха

- Оператор может внести одну небольшую правку профиля без ощущения, что будет
  переписан весь profile.
- Tech Spec scope можно вывести без изобретения yield target account semantics.
```

## Good Tech Spec Fragment

The Tech Spec answers HOW and traces decisions back to PRD anchors.

```markdown
## Источник PRD

Поддерживает R1-R7 из PRD: Agent profile settings cleanup.

## Архитектура

Сохраняем существующие profile service и data model. Текущий широкий profile
save action разделяется на три server actions, каждая владеет только fields
своего блока.

Поддерживает R1, R2, R3.

## Контракты и границы

- Identity action владеет identity, phase, jurisdiction, residency и related
  identity fields.
- Voice action владеет tone и guardrail fields.
- Context action владеет background/context narrative fields.
- Goals и Yield targets сохраняют существующую data shape.

Поддерживает R2, R4, R6.

## Валидация

- Unit tests покрывают partial FormData для каждой split action.
- Browser smoke подтверждает, что Save identity, Save voice, Save context
  видимы, Add goal открывает modal, а Yield target copy использует
  platform/asset language.

Поддерживает AE1, AE2, AE3.
```

## Good Issue Links Shape

The Issue contains chips and resources, not copied documents.

```markdown
# Связи

<project id="project-profile-workbench">Agent profile settings cleanup</project>
<document id="prd-profile-workbench">PRD: Agent profile settings cleanup</document>
<document id="spec-profile-workbench">Tech Spec: Agent profile settings cleanup</document>
```

The Issue may also add PRD and Tech Spec as resources or links when the Linear
connector supports it. It must not attach PRD or Tech Spec documents to the
Issue itself.

## Bad Anti-Examples

Bad Project body:

```markdown
# Lifecycle

Status: Delivery.

# Документы

Active PRD: ...
Active Tech Spec: ...

# План задач

Run linear-check delivery, then create a PR.
```

Why it fails: Project body became a workflow dashboard.

Bad Tech Spec body:

```markdown
## Skill contracts

linear-check design must pass before linear-issue runs.
Move Project to Delivery after PRD and Tech Spec exist.
```

Why it fails: Tech Spec leaked agent workflow mechanics and wrong lifecycle
semantics.

Bad Issue body:

```markdown
# Связи

PRD: https://linear.app/example/document/raw-url
Tech Spec attached below as an Issue document.
```

Why it fails: chips/resources were available, but the Issue used raw URLs and
attached upstream documents.
