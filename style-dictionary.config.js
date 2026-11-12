export default {
  source: ['src/views/styles/tokens/tokens.json'],
  hooks: {
    transforms: {
      'duration/css': {
        type: 'value',
        filter: (token) =>
          (token.$type ?? token.type) === 'duration' ||
          (typeof (token.$value ?? token.value) === 'object' &&
            Boolean((token.$value ?? token.value)?.unit)),
        transform: (token) => {
          const v = token.$value ?? token.value;
          if (typeof v === 'object' && v !== null && 'value' in v) {
            return `${v.value}${v.unit || 'ms'}`;
          }
          return v;
        },
      },
    },
  },
  platforms: {
    css: {
      transformGroup: 'css',
      transforms: ['duration/css'],
      prefix: 'q',
      buildPath: 'src/views/styles/tokens/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            outputReferences: true,
          },
        },
      ],
    },
  },
};
