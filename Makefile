PNPM ?= pnpm
APP ?= www

.DEFAULT_GOAL := quality
.NOTPARALLEL: ci

.PHONY: install dev quality supply-chain build ci test test-watch

install:
	$(PNPM) install --frozen-lockfile

dev:
	$(PNPM) --filter @seasonalnet/$(APP) dev

quality:
	$(PNPM) run quality

build:
	$(PNPM) run build

supply-chain:
	$(PNPM) audit signatures
	$(PNPM) audit --audit-level moderate

ci: supply-chain quality build

test:
	$(PNPM) run test

test-watch:
	$(PNPM) run test:watch
