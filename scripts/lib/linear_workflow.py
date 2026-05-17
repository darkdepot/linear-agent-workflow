#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


REPOSITORY_URL = "https://github.com/darkdepot/linear-agent-workflow.git"
LOCKFILE_RELATIVE_PATH = Path(".agents/linear-workflow.lock.json")
LOCKFILE_SCHEMA_VERSION = 1
ADAPTER_FORMAT_VERSION = 1
COMMAND_TIMEOUT_SECONDS = 60
SKILL_PREFIX = "linear-"
HOST_DIRS = {
    "codex": Path(".agents/skills"),
    "claude": Path(".claude/skills"),
}

SCRIPT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Skill:
    name: str
    description: str
    canonical_path: Path


class WorkflowError(RuntimeError):
    pass


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="linear-workflow",
        description="Install, update, and check Linear Agent Workflow adapters.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    add_install_parser(subparsers, "install")
    add_install_parser(subparsers, "update")

    check_parser = subparsers.add_parser("check")
    check_parser.add_argument("--mode", choices=("self", "consumer"), required=True)
    check_parser.add_argument("--target", required=True)
    check_parser.add_argument("--source")
    check_parser.add_argument("--latest", action="store_true")

    args = parser.parse_args()

    try:
        if args.command == "install":
            install_or_update(args, update=False)
        elif args.command == "update":
            install_or_update(args, update=True)
        elif args.command == "check":
            check(args)
        else:
            raise WorkflowError(f"Unknown command: {args.command}")
    except WorkflowError as exc:
        print(f"BROKEN: {exc}", file=sys.stderr)
        return 1

    return 0


def add_install_parser(subparsers: argparse._SubParsersAction, command: str) -> None:
    parser = subparsers.add_parser(command)
    parser.add_argument("--mode", choices=("self", "consumer"), required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--version")
    parser.add_argument("--commit")
    parser.add_argument("--repository", default=REPOSITORY_URL)
    parser.add_argument("--source")
    parser.add_argument("--hosts", default="codex,claude")
    parser.add_argument("--skills")
    parser.add_argument("--ship-workflow", default="gstack ship")
    parser.add_argument("--linear-language", default="ru")
    parser.add_argument("--skill-language", default="en")
    parser.add_argument("--consumer-name")
    if command == "update":
        parser.add_argument("--branch")


def install_or_update(args: argparse.Namespace, update: bool) -> None:
    target = Path(args.target).expanduser().resolve()
    hosts = parse_csv(args.hosts, allowed=set(HOST_DIRS))

    if args.mode == "self":
        require_self_target(target)
        skills = load_skills(SCRIPT_ROOT, parse_optional_csv(args.skills))
        write_self_wrappers(target, hosts, skills)
        print(f"PASS: generated self wrappers for {len(skills)} skills in {target}")
        return

    require_consumer_target(target)

    if update:
        ensure_reviewable_update_branch(target, getattr(args, "branch", None))

    if not args.version:
        raise WorkflowError("consumer mode requires --version, for example --version v0.1.0")

    source = Path(args.source).expanduser().resolve() if args.source else SCRIPT_ROOT
    commit = args.commit or resolve_version_commit(source, args.repository, args.version)
    require_commit_sha(commit)
    skills = load_skills_at_commit(source, commit, parse_optional_csv(args.skills))
    generator_version = load_version_at_commit(source, commit)

    lock = write_consumer_wrappers_and_lock(
        target=target,
        hosts=hosts,
        skills=skills,
        repository=args.repository,
        version=args.version,
        commit=commit,
        generator_version=generator_version,
        consumer_name=args.consumer_name or target.name,
        ship_workflow=args.ship_workflow,
        linear_language=args.linear_language,
        skill_language=args.skill_language,
    )

    action = "updated" if update else "installed"
    print(
        f"PASS: {action} consumer wrappers for {len(skills)} skills at "
        f"{lock['workflow']['version']} ({lock['workflow']['commit']})"
    )


def check(args: argparse.Namespace) -> None:
    target = Path(args.target).expanduser().resolve()

    if args.mode == "self":
        require_self_target(target)
        check_self(target)
        print("PASS: self wrappers are generated and point to repo-local skills")
        return

    require_consumer_target(target)
    source = Path(args.source).expanduser().resolve() if args.source else SCRIPT_ROOT
    status = check_consumer(target, source=source, check_latest=args.latest)
    print(status)


def parse_csv(value: str, allowed: set[str] | None = None) -> list[str]:
    items = [item.strip() for item in value.split(",") if item.strip()]
    if not items:
        raise WorkflowError("expected at least one comma-separated value")
    if allowed:
        unknown = sorted(set(items) - allowed)
        if unknown:
            raise WorkflowError(f"unknown value(s): {', '.join(unknown)}")
    return items


def parse_optional_csv(value: str | None) -> list[str] | None:
    if value is None:
        return None
    return parse_csv(value)


def load_version(root: Path) -> str:
    version_file = root / "VERSION"
    if not version_file.exists():
        raise WorkflowError(f"missing VERSION in {root}")
    version = version_file.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise WorkflowError(f"VERSION must be SemVer without v-prefix, got {version!r}")
    return version


def load_skills(root: Path, requested: list[str] | None) -> list[Skill]:
    skills_root = root / "skills"
    if not skills_root.exists():
        raise WorkflowError(f"missing skills directory in {root}")

    skills: list[Skill] = []
    for skill_dir in sorted(skills_root.iterdir()):
        if not skill_dir.is_dir() or not skill_dir.name.startswith(SKILL_PREFIX):
            continue
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
        meta = parse_frontmatter(skill_file)
        name = meta.get("name", skill_dir.name)
        description = meta.get("description", "")
        skills.append(Skill(name=name, description=description, canonical_path=skill_file.relative_to(root)))

    if requested:
        requested_set = set(requested)
        skills = [skill for skill in skills if skill.name in requested_set]
        missing = sorted(requested_set - {skill.name for skill in skills})
        if missing:
            raise WorkflowError(f"requested skill(s) not found: {', '.join(missing)}")

    if not skills:
        raise WorkflowError("no linear-* skills found")

    return skills


def parse_frontmatter(path: Path) -> dict[str, str]:
    return parse_frontmatter_text(path.read_text(encoding="utf-8"))


def parse_frontmatter_text(content: str) -> dict[str, str]:
    lines = content.splitlines()
    if not lines or lines[0] != "---":
        return {}

    metadata: dict[str, str] = {}
    for line in lines[1:]:
        if line == "---":
            break
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip()
    return metadata


def load_version_at_commit(source: Path, commit: str) -> str:
    content = git_show(source, commit, "VERSION").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", content):
        raise WorkflowError(f"pinned VERSION must be SemVer without v-prefix, got {content!r}")
    return content


def load_skills_at_commit(source: Path, commit: str, requested: list[str] | None) -> list[Skill]:
    ensure_commit_available(source, commit)
    tree = run_git(source, "ls-tree", "-d", "--name-only", commit, "skills/")
    skill_names = sorted(
        Path(line.strip()).name
        for line in tree.splitlines()
        if Path(line.strip()).name.startswith(SKILL_PREFIX)
    )

    skills: list[Skill] = []
    for skill_name in skill_names:
        canonical_path = Path("skills") / skill_name / "SKILL.md"
        content = git_show(source, commit, canonical_path.as_posix())
        meta = parse_frontmatter_text(content)
        name = meta.get("name", skill_name)
        description = meta.get("description", "")
        skills.append(Skill(name=name, description=description, canonical_path=canonical_path))

    return filter_requested_skills(skills, requested)


def filter_requested_skills(skills: list[Skill], requested: list[str] | None) -> list[Skill]:
    if requested:
        requested_set = set(requested)
        skills = [skill for skill in skills if skill.name in requested_set]
        missing = sorted(requested_set - {skill.name for skill in skills})
        if missing:
            raise WorkflowError(f"requested skill(s) not found in pinned commit: {', '.join(missing)}")

    if not skills:
        raise WorkflowError("no linear-* skills found")

    return skills


def require_self_target(target: Path) -> None:
    if target != SCRIPT_ROOT.resolve():
        raise WorkflowError(
            "self mode can only target this linear-agent-workflow checkout; "
            "use --mode consumer for other repos"
        )
    if not is_workflow_repo(target):
        raise WorkflowError(f"self target does not look like linear-agent-workflow: {target}")


def require_consumer_target(target: Path) -> None:
    if not target.exists():
        raise WorkflowError(f"target repo does not exist: {target}")
    if target == SCRIPT_ROOT.resolve() or is_workflow_repo(target):
        raise WorkflowError("consumer mode refuses to target the reusable workflow repo")


def is_workflow_repo(path: Path) -> bool:
    return (
        (path / "skills/linear-check/SKILL.md").exists()
        and (path / "references").is_dir()
        and (path / "templates").is_dir()
        and (path / "AGENTS.md").exists()
    )


def write_self_wrappers(target: Path, hosts: Iterable[str], skills: Iterable[Skill]) -> None:
    for host in hosts:
        host_root = target / HOST_DIRS[host]
        for skill in skills:
            wrapper = host_root / skill.name / "SKILL.md"
            wrapper.parent.mkdir(parents=True, exist_ok=True)
            wrapper.write_text(self_wrapper_content(skill), encoding="utf-8")


def write_consumer_wrappers_and_lock(
    *,
    target: Path,
    hosts: Iterable[str],
    skills: list[Skill],
    repository: str,
    version: str,
    commit: str,
    generator_version: str,
    consumer_name: str,
    ship_workflow: str,
    linear_language: str,
    skill_language: str,
) -> dict:
    hosts_list = list(hosts)
    wrapper_paths = [
        target / HOST_DIRS[host] / skill.name / "SKILL.md"
        for host in hosts_list
        for skill in skills
    ]
    next_wrapper_paths = {path.relative_to(target).as_posix() for path in wrapper_paths}

    cleanup_removed_generated_wrappers(target, next_wrapper_paths)

    for host in hosts_list:
        host_root = target / HOST_DIRS[host]
        for skill in skills:
            wrapper = host_root / skill.name / "SKILL.md"
            wrapper.parent.mkdir(parents=True, exist_ok=True)
            wrapper.write_text(consumer_wrapper_content(skill), encoding="utf-8")

    generated_files = [
        {
            "path": str(path.relative_to(target)),
            "sha256": sha256_file(path),
        }
        for path in sorted(wrapper_paths)
    ]

    lock = {
        "schemaVersion": LOCKFILE_SCHEMA_VERSION,
        "workflow": {
            "name": "linear-agent-workflow",
            "repository": repository,
            "version": version,
            "commit": commit,
        },
        "adapter": {
            "formatVersion": ADAPTER_FORMAT_VERSION,
            "generatorVersion": generator_version,
            "hosts": hosts_list,
            "skills": [skill.name for skill in skills],
            "generatedFiles": generated_files,
        },
        "consumer": {
            "name": consumer_name,
            "shipWorkflow": ship_workflow,
            "linearFacingLanguage": linear_language,
            "skillInstructionLanguage": skill_language,
        },
    }

    lock_path = target / LOCKFILE_RELATIVE_PATH
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_path.write_text(json.dumps(lock, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    return lock


def self_wrapper_content(skill: Skill) -> str:
    return (
        "---\n"
        f"name: {skill.name}\n"
        f"description: {skill.description}\n"
        "---\n\n"
        "<!-- GENERATED by linear-agent-workflow scripts. Mode: self. Do not edit directly. -->\n\n"
        f"# {skill.name}\n\n"
        "This is a discovery wrapper for self-consumer mode.\n\n"
        "Open the canonical repo-local skill:\n\n"
        f"`{skill.canonical_path.as_posix()}`\n\n"
        "Follow that file as the source of truth. This wrapper is not workflow truth.\n"
    )


def consumer_wrapper_content(skill: Skill) -> str:
    return (
        "---\n"
        f"name: {skill.name}\n"
        f"description: {skill.description}\n"
        "---\n\n"
        "<!-- GENERATED by linear-agent-workflow scripts. Mode: consumer. Do not edit directly. -->\n\n"
        f"# {skill.name}\n\n"
        "This is a discovery wrapper for consumer mode.\n\n"
        "Read `.agents/linear-workflow.lock.json` in this repo. Resolve the workflow source from:\n\n"
        "- `workflow.repository`\n"
        "- `workflow.version`\n"
        "- `workflow.commit`\n\n"
        f"Open and follow `skills/{skill.name}/SKILL.md` at the pinned commit. Prefer a cached checkout keyed "
        "by the exact 40-character commit SHA, or fetch the raw file for that SHA.\n\n"
        "Do not resolve from `main`, a sibling checkout, or a machine-specific absolute path. "
        "This wrapper is not workflow truth.\n"
    )


def check_self(target: Path) -> None:
    skills = load_skills(target, None)
    problems: list[str] = []
    for host, host_dir in HOST_DIRS.items():
        for skill in skills:
            wrapper = target / host_dir / skill.name / "SKILL.md"
            if not wrapper.exists():
                problems.append(f"missing {host} wrapper: {wrapper.relative_to(target)}")
                continue
            expected = self_wrapper_content(skill)
            actual = wrapper.read_text(encoding="utf-8")
            if actual != expected:
                problems.append(f"drifted {host} wrapper: {wrapper.relative_to(target)}")

    if (target / LOCKFILE_RELATIVE_PATH).exists():
        problems.append("self mode must not have .agents/linear-workflow.lock.json")

    if problems:
        raise WorkflowError("self check failed:\n- " + "\n- ".join(problems))


def check_consumer(target: Path, source: Path, check_latest: bool) -> str:
    lock_path = target / LOCKFILE_RELATIVE_PATH
    if not lock_path.exists():
        raise WorkflowError(f"missing consumer lockfile: {LOCKFILE_RELATIVE_PATH}")

    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    validate_lock_shape(lock)
    workflow = lock["workflow"]
    adapter = lock["adapter"]

    commit = workflow["commit"]
    require_commit_sha(commit)

    resolved = resolve_version_commit(source, workflow["repository"], workflow["version"])
    if resolved != commit:
        raise WorkflowError(
            f"pinned commit does not match {workflow['version']}: lockfile={commit}, resolved={resolved}"
        )

    pinned_skill_names = {skill.name for skill in load_skills_at_commit(source, commit, None)}
    missing_pinned_skills = sorted(set(adapter["skills"]) - pinned_skill_names)
    if missing_pinned_skills:
        raise WorkflowError(
            "lockfile references skills missing from pinned commit:\n- "
            + "\n- ".join(missing_pinned_skills)
        )

    validate_generated_file_coverage(adapter)
    expected_generated_paths = {
        parse_lockfile_relative_path(generated["path"]).as_posix()
        for generated in adapter["generatedFiles"]
    }

    drift: list[str] = []
    for generated in adapter["generatedFiles"]:
        rel_path = parse_lockfile_relative_path(generated["path"])
        wrapper = target / rel_path
        if not wrapper.exists():
            drift.append(f"missing generated wrapper: {rel_path.as_posix()}")
            continue
        actual_hash = sha256_file(wrapper)
        if actual_hash != generated["sha256"]:
            drift.append(f"hash mismatch: {rel_path.as_posix()}")
        content = wrapper.read_text(encoding="utf-8")
        if "Mode: consumer" not in content or LOCKFILE_RELATIVE_PATH.as_posix() not in content:
            drift.append(f"wrapper is not generated/thin: {rel_path.as_posix()}")
        if "github.com/darkdepot/linear-agent-workflow/blob/main" in content:
            drift.append(f"wrapper resolves from main: {rel_path.as_posix()}")

    orphaned_wrappers = find_orphan_generated_wrappers(target, expected_generated_paths)
    if orphaned_wrappers:
        drift.extend(
            "unexpected generated wrapper not in lockfile: " + path.as_posix()
            for path in orphaned_wrappers
        )

    copied_truth = find_copied_truth_dirs(target)
    if copied_truth:
        drift.extend(
            "copied workflow truth (consumer skill dirs must not copy workflow truth): "
            + path.as_posix()
            for path in copied_truth
        )

    if drift:
        raise WorkflowError("DRIFT: consumer adapters changed outside generator:\n- " + "\n- ".join(drift))

    if check_latest:
        latest = latest_semver_tag(source, workflow["repository"])
        if latest and compare_semver_tags(latest, workflow["version"]) > 0:
            return f"STALE: pinned {workflow['version']} but latest available is {latest}"

    return f"PASS: consumer wrappers match lockfile at {workflow['version']} ({commit})"


def validate_lock_shape(lock: dict) -> None:
    if lock.get("schemaVersion") != LOCKFILE_SCHEMA_VERSION:
        raise WorkflowError(f"unsupported lockfile schemaVersion: {lock.get('schemaVersion')}")

    for section in ("workflow", "adapter", "consumer"):
        if section not in lock or not isinstance(lock[section], dict):
            raise WorkflowError(f"lockfile missing section: {section}")

    workflow = lock["workflow"]
    for key in ("repository", "version", "commit"):
        if not workflow.get(key):
            raise WorkflowError(f"lockfile missing workflow.{key}")

    adapter = lock["adapter"]
    if adapter.get("formatVersion") != ADAPTER_FORMAT_VERSION:
        raise WorkflowError(f"unsupported adapter formatVersion: {adapter.get('formatVersion')}")
    if not adapter.get("generatorVersion"):
        raise WorkflowError("lockfile missing adapter.generatorVersion")
    if not adapter.get("generatedFiles"):
        raise WorkflowError("lockfile missing adapter.generatedFiles")
    if not adapter.get("hosts"):
        raise WorkflowError("lockfile missing adapter.hosts")
    if not adapter.get("skills"):
        raise WorkflowError("lockfile missing adapter.skills")
    unknown_hosts = sorted(set(adapter["hosts"]) - set(HOST_DIRS))
    if unknown_hosts:
        raise WorkflowError(f"lockfile has unknown adapter.hosts: {', '.join(unknown_hosts)}")

    consumer = lock["consumer"]
    for key in ("shipWorkflow", "linearFacingLanguage", "skillInstructionLanguage"):
        if not consumer.get(key):
            raise WorkflowError(f"lockfile missing consumer.{key}")


def validate_generated_file_coverage(adapter: dict) -> None:
    expected_paths = {
        (HOST_DIRS[host] / skill / "SKILL.md").as_posix()
        for host in adapter["hosts"]
        for skill in adapter["skills"]
    }

    generated_paths: list[str] = []
    for generated in adapter["generatedFiles"]:
        if not isinstance(generated, dict) or not generated.get("path") or not generated.get("sha256"):
            raise WorkflowError("lockfile adapter.generatedFiles entries require path and sha256")
        generated_paths.append(parse_lockfile_relative_path(generated["path"]).as_posix())

    duplicates = sorted({path for path in generated_paths if generated_paths.count(path) > 1})
    missing = sorted(expected_paths - set(generated_paths))
    unexpected = sorted(set(generated_paths) - expected_paths)

    problems: list[str] = []
    if duplicates:
        problems.append("duplicate generated file entries: " + ", ".join(duplicates))
    if missing:
        problems.append("missing generated file entries: " + ", ".join(missing))
    if unexpected:
        problems.append("unexpected generated file entries: " + ", ".join(unexpected))

    if problems:
        raise WorkflowError("lockfile generatedFiles does not match adapter.hosts x adapter.skills:\n- " + "\n- ".join(problems))


def parse_lockfile_relative_path(value: str) -> Path:
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise WorkflowError(f"lockfile generated path must stay inside the repo: {value}")
    return path


def find_copied_truth_dirs(target: Path) -> list[Path]:
    copied: list[Path] = []
    for host_dir in HOST_DIRS.values():
        skills_dir = target / host_dir
        if not skills_dir.exists():
            continue
        for skill_dir in skills_dir.glob("linear-*"):
            for truth_name in ("references", "templates"):
                copied_dir = skill_dir / truth_name
                if copied_dir.exists():
                    copied.append(copied_dir.relative_to(target))
    return copied


def find_orphan_generated_wrappers(target: Path, expected_paths: set[str]) -> list[Path]:
    orphaned: list[Path] = []
    for host_dir in HOST_DIRS.values():
        skills_dir = target / host_dir
        if not skills_dir.exists():
            continue
        for wrapper in skills_dir.glob("linear-*/SKILL.md"):
            rel_path = wrapper.relative_to(target)
            if rel_path.as_posix() in expected_paths:
                continue
            content = wrapper.read_text(encoding="utf-8")
            if "GENERATED by linear-agent-workflow scripts. Mode: consumer" in content:
                orphaned.append(rel_path)
    return orphaned


def cleanup_removed_generated_wrappers(target: Path, next_wrapper_paths: set[str]) -> None:
    lock_path = target / LOCKFILE_RELATIVE_PATH
    if not lock_path.exists():
        return

    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    adapter = lock.get("adapter")
    if not isinstance(adapter, dict):
        return

    generated_files = adapter.get("generatedFiles", [])
    if not isinstance(generated_files, list):
        return

    for generated in generated_files:
        if not isinstance(generated, dict) or not generated.get("path") or not generated.get("sha256"):
            continue

        rel_path = parse_lockfile_relative_path(generated["path"])
        if rel_path.as_posix() in next_wrapper_paths:
            continue

        wrapper = target / rel_path
        if not wrapper.exists():
            continue

        if sha256_file(wrapper) != generated["sha256"]:
            raise WorkflowError(
                "refusing to remove modified generated wrapper no longer present in the requested version: "
                + rel_path.as_posix()
            )

        wrapper.unlink()
        try:
            wrapper.parent.rmdir()
        except OSError:
            pass


def ensure_reviewable_update_branch(target: Path, requested_branch: str | None) -> None:
    git_dir = target / ".git"
    if not git_dir.is_dir() and not git_dir.is_file():
        return

    if requested_branch:
        run_git(target, "switch", "-c", requested_branch)
        return

    branch = run_git(target, "branch", "--show-current").strip()
    if branch in {"main", "master", "trunk"}:
        raise WorkflowError(
            "consumer update refuses to edit the default branch; pass --branch or switch to a review branch"
        )


def resolve_version_commit(source: Path, repository: str, version: str) -> str:
    if not version.startswith("v"):
        raise WorkflowError(f"consumer versions must be SemVer tags with v-prefix, got {version!r}")

    if source.exists() and (source / ".git").exists():
        return run_git(source, "rev-parse", f"{version}^{{commit}}").strip()

    return resolve_remote_tag_commit(repository, version)


def resolve_remote_tag_commit(repository: str, version: str) -> str:
    output = run_command("git", "ls-remote", "--tags", repository, version, f"{version}^{{}}")
    tagged_commit: str | None = None
    fallback_commit: str | None = None
    for line in output.splitlines():
        parts = line.split()
        if len(parts) < 2:
            continue
        commit, ref = parts[0], parts[1]
        if ref.endswith(f"refs/tags/{version}^{{}}"):
            tagged_commit = commit
        elif ref.endswith(f"refs/tags/{version}"):
            fallback_commit = commit
    resolved = tagged_commit or fallback_commit
    if not resolved:
        raise WorkflowError(f"could not resolve remote tag {version} from {repository}")
    return resolved


def latest_semver_tag(source: Path | None, repository: str) -> str | None:
    if source and source.exists() and (source / ".git").exists():
        output = run_git(source, "tag", "--list", "v[0-9]*.[0-9]*.[0-9]*")
        tags = [tag.strip() for tag in output.splitlines() if tag.strip()]
        return max(tags, key=semver_tuple) if tags else None
    return latest_remote_semver_tag(repository)


def latest_remote_semver_tag(repository: str) -> str | None:
    output = run_command("git", "ls-remote", "--tags", repository, "v[0-9]*.[0-9]*.[0-9]*")
    tags: set[str] = set()
    for line in output.splitlines():
        parts = line.split()
        if len(parts) < 2:
            continue
        ref = parts[1]
        tag = ref.removeprefix("refs/tags/").removesuffix("^{}")
        if re.fullmatch(r"v\d+\.\d+\.\d+", tag):
            tags.add(tag)
    return max(tags, key=semver_tuple) if tags else None


def compare_semver_tags(left: str, right: str) -> int:
    left_tuple = semver_tuple(left)
    right_tuple = semver_tuple(right)
    if left_tuple > right_tuple:
        return 1
    if left_tuple < right_tuple:
        return -1
    return 0


def semver_tuple(tag: str) -> tuple[int, int, int]:
    match = re.fullmatch(r"v(\d+)\.(\d+)\.(\d+)", tag)
    if not match:
        raise WorkflowError(f"not a SemVer tag: {tag}")
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def require_commit_sha(commit: str) -> None:
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise WorkflowError(f"expected immutable 40-character commit SHA, got {commit!r}")


def ensure_commit_available(source: Path, commit: str) -> None:
    if not source.exists() or not (source / ".git").exists():
        raise WorkflowError(
            "pinned workflow content requires a local git source; pass --source pointing to a "
            "linear-agent-workflow checkout that has the requested tag"
        )
    run_git(source, "cat-file", "-e", f"{commit}^{{commit}}")


def git_show(source: Path, commit: str, relative_path: str) -> str:
    ensure_commit_available(source, commit)
    return run_git(source, "show", f"{commit}:{relative_path}")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_git(cwd: Path, *args: str) -> str:
    return run_command("git", "-C", str(cwd), *args)


def run_command(*args: str) -> str:
    try:
        process = subprocess.run(
            args,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=COMMAND_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        raise WorkflowError(f"command timed out after {COMMAND_TIMEOUT_SECONDS}s: {' '.join(args)}") from exc
    if process.returncode != 0:
        raise WorkflowError(process.stderr.strip() or f"command failed: {' '.join(args)}")
    return process.stdout


if __name__ == "__main__":
    raise SystemExit(main())
