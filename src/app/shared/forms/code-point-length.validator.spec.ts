import { FormControl } from '@angular/forms';
import { codePointLength, codePointLengthBetween } from './code-point-length.validator';

const errorsFor = (value: string) => codePointLengthBetween(20, 30)(new FormControl(value));

describe('codePointLength', () => {
  it('counts what the API counts: code points, ignoring the ends', () => {
    expect(codePointLength('  hello  ')).toBe(5);
    expect(codePointLength('😀😀')).toBe(2); // two code points, although "😀😀".length is 4
    expect(codePointLength('👨‍👩‍👧')).toBe(5);
    expect(codePointLength('')).toBe(0);
  });
});

describe('codePointLengthBetween', () => {
  it('leaves an empty value to the required validator', () => {
    expect(errorsFor('')).toBeNull();
    expect(errorsFor('     ')).toBeNull();
  });

  it('accepts the limits themselves', () => {
    expect(errorsFor('x'.repeat(20))).toBeNull();
    expect(errorsFor('x'.repeat(30))).toBeNull();
  });

  it('reports a text that is too short, with the limit for the message', () => {
    expect(errorsFor('x'.repeat(19))).toEqual({
      minlength: { requiredLength: 20, actualLength: 19 },
    });
  });

  it('reports a text that is too long, with the limit for the message', () => {
    expect(errorsFor('x'.repeat(31))).toEqual({
      maxlength: { requiredLength: 30, actualLength: 31 },
    });
  });

  it('does not count an emoji twice (unlike Validators.maxLength)', () => {
    expect(errorsFor('😀'.repeat(30))).toBeNull(); // 30 code points, 60 UTF-16 units
    expect(errorsFor('😀'.repeat(31))).not.toBeNull();
  });

  it('ignores spaces around the text, as the server does', () => {
    expect(errorsFor('   ' + 'x'.repeat(19) + '   ')).toEqual({
      minlength: { requiredLength: 20, actualLength: 19 },
    });
  });
});
