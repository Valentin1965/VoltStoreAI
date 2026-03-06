import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface DualPriceProps {
  priceExVat: number;
  className?: string;
  secondaryClassName?: string;
  align?: 'left' | 'center' | 'right';
  showLabels?: boolean;
}

export const DualPrice: React.FC<DualPriceProps> = ({ 
  priceExVat, 
  className = "", 
  secondaryClassName = "",
  align = 'left',
  showLabels = true
}) => {
  const { formatPrice, language } = useLanguage();
  const priceIncVat = priceExVat * 1.25;
  
  const alignmentClass = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right'
  }[align];

  const labels = {
    da: { inc: 'Inkl. moms', ex: 'Ekskl. moms' },
    en: { inc: 'Incl. VAT', ex: 'Excl. VAT' },
    no: { inc: 'Inkl. mva', ex: 'Ekskl. mva' },
    se: { inc: 'Inkl. moms', ex: 'Exkl. moms' }
  }[language] || { inc: 'Incl. VAT', ex: 'Excl. VAT' };

  return (
    <div className={`flex flex-col leading-tight ${alignmentClass} ${className}`}>
      <div className="font-black flex items-baseline gap-1">
        <span>{formatPrice(priceExVat)}</span>
        {showLabels && <span className="text-[8px] opacity-50 font-bold uppercase tracking-tighter">{labels.ex}</span>}
      </div>
      <div className={`text-[10px] font-bold flex items-baseline gap-1 text-emerald-500 ${secondaryClassName}`}>
        <span>{formatPrice(priceIncVat)}</span>
        {showLabels && <span className="text-[7px] opacity-80 uppercase tracking-tighter">{labels.inc}</span>}
      </div>
    </div>
  );
};
