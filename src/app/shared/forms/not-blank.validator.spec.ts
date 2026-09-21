import { FormControl } from '@angular/forms';
import { notBlank } from './not-blank.validator';

describe('notBlank', () => {
  it.each(['Marta', ' Marta ', 'a', '😀'])('accepts %j', (value) => {
    expect(notBlank(new FormControl(value))).toBeNull();
  });

  it.each([' ', '   ', '\t', '\n ', ' '])('rejects %j as required', (value) => {
    expect(notBlank(new FormControl(value))).toEqual({ required: true });
  });

  it.each(['', null, undefined])('leaves %j to Validators.required', (value) => {
    expect(notBlank(new FormControl(value))).toBeNull();
  });
});
