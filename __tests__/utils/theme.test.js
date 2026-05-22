import { COLORS, RADIUS, SPACING, SHADOWS } from '../../utils/theme';

describe('theme', () => {
  describe('COLORS', () => {
    it('should have all primary colors defined', () => {
      expect(COLORS.primary).toBe('#87C38F');
      expect(COLORS.primaryLight).toBe('#B5E3B8');
      expect(COLORS.primaryDark).toBe('#6FA375');
    });

    it('should have all secondary colors defined', () => {
      expect(COLORS.secondary).toBe('#E07A5F');
      expect(COLORS.secondaryLight).toBe('#F0B6A3');
      expect(COLORS.secondaryDark).toBe('#C85A3F');
    });

    it('should have accent colors defined', () => {
      expect(COLORS.accent).toBe('#F2CC8F');
      expect(COLORS.accentLight).toBe('#F8E4B8');
      expect(COLORS.accentDark).toBe('#D4B06F');
    });

    it('should have background colors defined', () => {
      expect(COLORS.background).toBe('#F8F9FA');
      expect(COLORS.backgroundCard).toBe('#FFFFFF');
      expect(COLORS.backgroundLight).toBe('#FFFFFF');
    });

    it('should have text colors defined', () => {
      expect(COLORS.textDark).toBe('#2D3436');
      expect(COLORS.textLight).toBe('#636E72');
      expect(COLORS.textMuted).toBe('#95A5A6');
    });

    it('should have status colors defined', () => {
      expect(COLORS.success).toBe('#00B894');
      expect(COLORS.error).toBe('#FF6B6B');
      expect(COLORS.warning).toBe('#FDCB6E');
      expect(COLORS.info).toBe('#E07A5F');
    });

    it('should have gradient arrays defined', () => {
      expect(COLORS.gradientPrimary).toEqual(['#87C38F', '#6FA375']);
      expect(COLORS.gradientSecondary).toEqual(['#E07A5F', '#C85A3F']);
      expect(COLORS.gradientAccent).toEqual(['#F2CC8F', '#D4B06F']);
      expect(COLORS.gradientNeutral).toEqual(['#F8F9FA', '#FFFFFF']);
    });

    it('should have valid hex color format for all colors', () => {
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      
      Object.values(COLORS).forEach((value) => {
        if (typeof value === 'string' && value.startsWith('#')) {
          expect(value).toMatch(hexColorRegex);
        } else if (Array.isArray(value)) {
          value.forEach((color) => {
            if (typeof color === 'string' && color.startsWith('#')) {
              expect(color).toMatch(hexColorRegex);
            }
          });
        }
      });
    });
  });

  describe('RADIUS', () => {
    it('should have all radius values defined as numbers', () => {
      expect(typeof RADIUS.small).toBe('number');
      expect(typeof RADIUS.medium).toBe('number');
      expect(typeof RADIUS.large).toBe('number');
      expect(typeof RADIUS.xlarge).toBe('number');
      expect(typeof RADIUS.full).toBe('number');
    });

    it('should have correct radius values', () => {
      expect(RADIUS.small).toBe(8);
      expect(RADIUS.medium).toBe(12);
      expect(RADIUS.large).toBe(16);
      expect(RADIUS.xlarge).toBe(24);
      expect(RADIUS.full).toBe(9999);
    });
  });

  describe('SPACING', () => {
    it('should have all spacing values defined as numbers', () => {
      expect(typeof SPACING.xs).toBe('number');
      expect(typeof SPACING.sm).toBe('number');
      expect(typeof SPACING.md).toBe('number');
      expect(typeof SPACING.lg).toBe('number');
      expect(typeof SPACING.xl).toBe('number');
      expect(typeof SPACING.xxl).toBe('number');
    });

    it('should have correct spacing values', () => {
      expect(SPACING.xs).toBe(4);
      expect(SPACING.sm).toBe(8);
      expect(SPACING.md).toBe(16);
      expect(SPACING.lg).toBe(24);
      expect(SPACING.xl).toBe(32);
      expect(SPACING.xxl).toBe(48);
    });
  });

  describe('SHADOWS', () => {
    it('should have all shadow values defined', () => {
      expect(SHADOWS.small).toBe('shadow-sm');
      expect(SHADOWS.medium).toBe('shadow-md');
      expect(SHADOWS.large).toBe('shadow-lg');
      expect(SHADOWS.xlarge).toBe('shadow-xl');
    });
  });
});

