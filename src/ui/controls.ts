import type { BoardConfig, Difficulty } from '../types';

export interface ControlsOptions {
  readonly onRestart: (config: BoardConfig) => void;
  readonly onHint?: () => void;
  readonly initialHintsRemaining?: number;
}

export interface Controls {
  readonly element: HTMLElement;
  update: (config: BoardConfig) => void;
  updateHints: (state: HintControlState) => void;
  destroy: () => void;
}

export interface HintControlState {
  readonly remaining: number;
  readonly disabled?: boolean;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly message: string | null;
}

type PresetDifficulty = Exclude<Difficulty, 'custom'>;

interface FormElements {
  readonly difficulty: HTMLSelectElement;
  readonly customFields: HTMLElement;
  readonly rows: HTMLInputElement;
  readonly cols: HTMLInputElement;
  readonly mines: HTMLInputElement;
  readonly error: HTMLElement;
  readonly form: HTMLFormElement;
  readonly hintButton: HTMLButtonElement;
}

const MIN_DIMENSION = 5;
const MAX_DIMENSION = 40;
const SAFE_START_CELLS = 9;

export const DIFFICULTY_CONFIGS: Record<PresetDifficulty, BoardConfig> = {
  beginner: {
    rows: 8,
    cols: 8,
    mines: 10,
    difficulty: 'beginner',
  },
  intermediate: {
    rows: 16,
    cols: 16,
    mines: 40,
    difficulty: 'intermediate',
  },
  expert: {
    rows: 16,
    cols: 30,
    mines: 99,
    difficulty: 'expert',
  },
};

export function createControls(
  element: HTMLElement,
  initialConfig: BoardConfig,
  options: ControlsOptions,
): Controls {
  element.replaceChildren(createControlsElement(initialConfig));

  const elements = queryFormElements(element);
  let currentHintState: HintControlState = {
    remaining: options.initialHintsRemaining ?? 0,
    disabled: options.onHint === undefined,
  };

  const render = (config: BoardConfig): void => {
    elements.difficulty.value = config.difficulty;
    elements.rows.value = String(config.rows);
    elements.cols.value = String(config.cols);
    elements.mines.value = String(config.mines);
    renderCustomFields(elements);
    renderValidation(elements, getSelectedConfig(elements).validation);
    renderHint(elements, currentHintState);
  };

  const handleDifficultyChange = (): void => {
    const selectedDifficulty = elements.difficulty.value as Difficulty;

    if (selectedDifficulty !== 'custom') {
      const presetConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
      elements.rows.value = String(presetConfig.rows);
      elements.cols.value = String(presetConfig.cols);
      elements.mines.value = String(presetConfig.mines);
    }

    updateMineLimit(elements);
    renderCustomFields(elements);
    renderValidation(elements, getSelectedConfig(elements).validation);
  };

  const handleInput = (): void => {
    updateMineLimit(elements);
    renderValidation(elements, getSelectedConfig(elements).validation);
  };

  const handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();

    const selected = getSelectedConfig(elements);
    renderValidation(elements, selected.validation);

    if (!selected.validation.valid || selected.config === null) {
      return;
    }

    options.onRestart(selected.config);
  };

  const handleHint = (): void => {
    options.onHint?.();
  };

  elements.difficulty.addEventListener('change', handleDifficultyChange);
  elements.rows.addEventListener('input', handleInput);
  elements.cols.addEventListener('input', handleInput);
  elements.mines.addEventListener('input', handleInput);
  elements.form.addEventListener('submit', handleSubmit);
  elements.hintButton.addEventListener('click', handleHint);

  render(initialConfig);

  return {
    element,
    update: render,
    updateHints: (state) => {
      currentHintState = state;
      renderHint(elements, currentHintState);
    },
    destroy: () => {
      elements.difficulty.removeEventListener('change', handleDifficultyChange);
      elements.rows.removeEventListener('input', handleInput);
      elements.cols.removeEventListener('input', handleInput);
      elements.mines.removeEventListener('input', handleInput);
      elements.form.removeEventListener('submit', handleSubmit);
      elements.hintButton.removeEventListener('click', handleHint);
      element.replaceChildren();
    },
  };
}

export function validateBoardConfig(config: BoardConfig): ValidationResult {
  if (!isIntegerInRange(config.rows, MIN_DIMENSION, MAX_DIMENSION)) {
    return {
      valid: false,
      message: `Rows must be ${String(MIN_DIMENSION)}-${String(MAX_DIMENSION)}.`,
    };
  }

  if (!isIntegerInRange(config.cols, MIN_DIMENSION, MAX_DIMENSION)) {
    return {
      valid: false,
      message: `Columns must be ${String(MIN_DIMENSION)}-${String(MAX_DIMENSION)}.`,
    };
  }

  if (!Number.isInteger(config.mines) || config.mines < 1) {
    return {
      valid: false,
      message: 'Mines must be at least 1.',
    };
  }

  const maxMines = getMaxMines(config.rows, config.cols);

  if (config.mines > maxMines) {
    return {
      valid: false,
      message: `Mines must be ${String(maxMines)} or fewer.`,
    };
  }

  return {
    valid: true,
    message: null,
  };
}

export function getMaxMines(rows: number, cols: number): number {
  return Math.max(0, rows * cols - SAFE_START_CELLS - 1);
}

function createControlsElement(config: BoardConfig): HTMLElement {
  const section = document.createElement('section');
  section.className = 'controls';
  section.setAttribute('aria-label', 'Board controls');

  const form = document.createElement('form');
  form.className = 'controls-form';
  form.noValidate = true;
  form.dataset.controlsForm = '';

  const difficultyField = document.createElement('label');
  difficultyField.className = 'field';

  const difficultyLabel = document.createElement('span');
  difficultyLabel.className = 'field-label';
  difficultyLabel.textContent = 'Difficulty';

  const difficultySelect = document.createElement('select');
  difficultySelect.name = 'difficulty';
  difficultySelect.dataset.controlsDifficulty = '';
  difficultySelect.append(
    createDifficultyOption('beginner', 'Easy'),
    createDifficultyOption('intermediate', 'Medium'),
    createDifficultyOption('expert', 'Hard'),
    createDifficultyOption('custom', 'Custom'),
  );

  difficultyField.append(difficultyLabel, difficultySelect);

  const customFields = document.createElement('div');
  customFields.className = 'custom-fields';
  customFields.dataset.controlsCustom = '';
  customFields.append(
    createNumberField(
      'Rows',
      'rows',
      config.rows,
      MIN_DIMENSION,
      MAX_DIMENSION,
    ),
    createNumberField(
      'Columns',
      'cols',
      config.cols,
      MIN_DIMENSION,
      MAX_DIMENSION,
    ),
    createNumberField(
      'Mines',
      'mines',
      config.mines,
      1,
      getMaxMines(config.rows, config.cols),
    ),
  );

  const error = document.createElement('p');
  error.className = 'form-error';
  error.id = 'board-config-error';
  error.setAttribute('role', 'alert');
  error.dataset.controlsError = '';

  const restartButton = document.createElement('button');
  restartButton.className = 'primary-button';
  restartButton.type = 'submit';
  restartButton.textContent = 'Restart';

  const hintButton = document.createElement('button');
  hintButton.className = 'secondary-button';
  hintButton.type = 'button';
  hintButton.dataset.controlsHint = '';

  const actionRow = document.createElement('div');
  actionRow.className = 'controls-actions';
  actionRow.append(restartButton, hintButton);

  form.append(difficultyField, customFields, error, actionRow);
  section.append(form);

  return section;
}

function createDifficultyOption(
  value: Difficulty,
  label: string,
): HTMLOptionElement {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;

  return option;
}

function createNumberField(
  label: string,
  name: 'rows' | 'cols' | 'mines',
  value: number,
  min: number,
  max: number,
): HTMLElement {
  const field = document.createElement('label');
  field.className = 'field';

  const labelElement = document.createElement('span');
  labelElement.className = 'field-label';
  labelElement.textContent = label;

  const input = document.createElement('input');
  input.type = 'number';
  input.name = name;
  input.value = String(value);
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.inputMode = 'numeric';
  input.dataset[controlsDataKey(name)] = '';
  input.setAttribute('aria-describedby', 'board-config-error');

  field.append(labelElement, input);

  return field;
}

function queryFormElements(root: HTMLElement): FormElements {
  return {
    difficulty: queryRequiredElement(
      root,
      '[data-controls-difficulty]',
      HTMLSelectElement,
    ),
    customFields: queryRequiredElement(
      root,
      '[data-controls-custom]',
      HTMLElement,
    ),
    rows: queryRequiredElement(root, '[data-controls-rows]', HTMLInputElement),
    cols: queryRequiredElement(root, '[data-controls-cols]', HTMLInputElement),
    mines: queryRequiredElement(
      root,
      '[data-controls-mines]',
      HTMLInputElement,
    ),
    error: queryRequiredElement(root, '[data-controls-error]', HTMLElement),
    form: queryRequiredElement(root, '[data-controls-form]', HTMLFormElement),
    hintButton: queryRequiredElement(
      root,
      '[data-controls-hint]',
      HTMLButtonElement,
    ),
  };
}

function queryRequiredElement<TElement extends HTMLElement>(
  root: HTMLElement,
  selector: string,
  constructor: new () => TElement,
): TElement {
  const element = root.querySelector(selector);

  if (element instanceof constructor) {
    return element;
  }

  throw new Error(`Controls element ${selector} was not found.`);
}

function getSelectedConfig(elements: FormElements): {
  readonly config: BoardConfig | null;
  readonly validation: ValidationResult;
} {
  const selectedDifficulty = elements.difficulty.value as Difficulty;

  if (selectedDifficulty !== 'custom') {
    const config = DIFFICULTY_CONFIGS[selectedDifficulty];

    return {
      config,
      validation: validateBoardConfig(config),
    };
  }

  const config = {
    rows: readInteger(elements.rows),
    cols: readInteger(elements.cols),
    mines: readInteger(elements.mines),
    difficulty: 'custom',
  } satisfies BoardConfig;
  const validation = validateBoardConfig(config);

  return {
    config: validation.valid ? config : null,
    validation,
  };
}

function renderCustomFields(elements: FormElements): void {
  const isCustom = elements.difficulty.value === 'custom';

  elements.customFields.hidden = !isCustom;
  elements.rows.disabled = !isCustom;
  elements.cols.disabled = !isCustom;
  elements.mines.disabled = !isCustom;
}

function renderValidation(
  elements: FormElements,
  validation: ValidationResult,
): void {
  const message = validation.message ?? '';

  elements.error.textContent = message;
  elements.error.hidden = validation.valid;
  elements.rows.setAttribute('aria-invalid', String(!validation.valid));
  elements.cols.setAttribute('aria-invalid', String(!validation.valid));
  elements.mines.setAttribute('aria-invalid', String(!validation.valid));
}

function renderHint(elements: FormElements, state: HintControlState): void {
  const remaining = Math.max(0, state.remaining);
  const disabled = state.disabled === true || remaining === 0;

  elements.hintButton.disabled = disabled;
  elements.hintButton.textContent = `Hint (${String(remaining)})`;
}

function updateMineLimit(elements: FormElements): void {
  const rows = readInteger(elements.rows);
  const cols = readInteger(elements.cols);

  if (Number.isInteger(rows) && Number.isInteger(cols)) {
    elements.mines.max = String(getMaxMines(rows, cols));
  }
}

function readInteger(input: HTMLInputElement): number {
  return Number.parseInt(input.value, 10);
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function controlsDataKey(name: 'rows' | 'cols' | 'mines'): string {
  switch (name) {
    case 'rows':
      return 'controlsRows';
    case 'cols':
      return 'controlsCols';
    case 'mines':
      return 'controlsMines';
  }
}
