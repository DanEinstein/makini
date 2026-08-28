/**
 * Maps Clerk's prebuilt UI onto the Makini palette (see DESIGN.md) so the
 * hosted components match the rest of the dark, focus-first interface.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#FFB224',
    colorBackground: '#161B22',
    colorText: '#dfe2eb',
    colorTextSecondary: '#d6c4ad',
    colorInputBackground: '#0D1117',
    colorInputText: '#dfe2eb',
    colorDanger: '#ffb4ab',
    colorSuccess: '#4edea3',
    borderRadius: '0.25rem',
    fontFamily: 'Inter, sans-serif'
  }
} as const;
