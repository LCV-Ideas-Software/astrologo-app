import { describe, expect, it } from 'vitest';
import { formatTatwaDurationPtBr, presentTatwa, renderTatwaEmailCautionHtml } from './tatwaPresentation';

describe('apresentação backward-compatible dos Tatwas', () => {
  it('identifica o novo método fixo e sua hipótese de fronteira', () => {
    expect(
      presentTatwa({
        schemaVersion: '2.0.0',
        calculationMode: 'fixed',
        principal: 'Tejas (Fogo)',
        sub: 'Akasha (Éter)',
        nearMainBoundary: true,
        mainBoundaryMarginSec: 44,
        subBoundaryMarginSec: 44,
        adjacentMain: {
          principal: 'Vayu (Ar)',
          sub: 'Prithvi (Terra)',
          relation: 'previous',
          secondsToBoundary: 44,
        },
      }),
    ).toMatchObject({
      mode: 'fixed',
      modeLabelPtBr: 'Ordem fixa — Akasha primeiro',
      principal: 'Tejas (Fogo)',
      sub: 'Akasha (Éter)',
      nearMainBoundary: true,
      adjacent: { principal: 'Vayu (Ar)', sub: 'Prithvi (Terra)' },
    });
  });

  it('preserva e identifica mapa antigo sem metadados como legacy-rulingFirst', () => {
    expect(presentTatwa({ principal: 'Tejas (Fogo)', sub: 'Tejas (Fogo)' })).toMatchObject({
      mode: 'legacy-rulingFirst',
      modeLabelPtBr: 'Ordem pelo principal',
      principal: 'Tejas (Fogo)',
      sub: 'Tejas (Fogo)',
      provenanceAvailable: false,
      subIsIndicative: true,
    });
  });

  it.each([null, undefined, {}, { principal: 'inexistente', sub: 'Akasha (Éter)' }])(
    'não transforma payload ausente ou malformado em registro legado: %j',
    (value) => {
      expect(presentTatwa(value)).toMatchObject({
        mode: 'unknown',
        modeLabelPtBr: 'Ordem não informada',
        provenanceAvailable: false,
        subIsIndicative: false,
      });
    },
  );

  it('não anuncia proveniência quando a âncora está vazia', () => {
    expect(
      presentTatwa({
        schemaVersion: '2.0.0',
        calculationMode: 'fixed',
        principal: 'Tejas (Fogo)',
        sub: 'Akasha (Éter)',
        nearMainBoundary: true,
        mainBoundaryMarginSec: 9_999_999,
        anchor: {},
      }),
    ).toMatchObject({
      mode: 'fixed',
      provenanceAvailable: false,
      subIsIndicative: true,
      nearMainBoundary: false,
      mainBoundaryMarginSec: null,
    });
  });

  it('não classifica um marcador desconhecido como legado', () => {
    expect(
      presentTatwa({ principal: 'Tejas (Fogo)', sub: 'Akasha (Éter)', calculationMode: 'future-mode' }),
    ).toMatchObject({ mode: 'unknown', modeLabelPtBr: 'Ordem não informada' });
  });

  it('nomeia uma ordem pelo principal explicitamente selecionada sem tratá-la como inferência', () => {
    expect(
      presentTatwa({
        principal: 'Tejas (Fogo)',
        sub: 'Tejas (Fogo)',
        calculationMode: 'legacy-rulingFirst',
      }),
    ).toMatchObject({
      mode: 'legacy-rulingFirst',
      modeOrigin: 'explicit',
      modeLabelPtBr: 'Ordem pelo principal — Tatwa principal primeiro',
    });
  });

  it('formata durações em português do Brasil', () => {
    expect(formatTatwaDurationPtBr(43)).toBe('43 s');
    expect(formatTatwaDurationPtBr(195)).toBe('3 min 15 s');
  });

  it('inclui no HTML do e-mail a cautela do subtatwa também para mapas legados', () => {
    const html = renderTatwaEmailCautionHtml(presentTatwa({ principal: 'Tejas (Fogo)', sub: 'Tejas (Fogo)' }));
    expect(html).toContain('subtatwa é indicativo');
    expect(html).not.toContain('undefined');
  });
});
