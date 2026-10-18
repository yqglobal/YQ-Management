import React from 'react';
import { CurrentTicketWidget } from './widgets/CurrentTicketWidget';
import { CustomerHistoryWidget } from './widgets/CustomerHistoryWidget';
import { CustomFormWidget } from './widgets/CustomFormWidget';
import { QueueGridWidget } from './widgets/QueueGridWidget';
import { ScheduleWidget } from './widgets/ScheduleWidget';
import { ClinicalNotesWidget } from './widgets/ClinicalNotesWidget';
import { PrescriptionWidget } from './widgets/PrescriptionWidget';

// A mapping of string IDs from the JSON config to actual React components
export const WIDGET_MAP: Record<string, React.FC<any>> = {
  CurrentTicketWidget: CurrentTicketWidget,
  CustomerHistoryWidget: CustomerHistoryWidget,
  CustomFormWidget: CustomFormWidget,
  QueueGridWidget: QueueGridWidget,
  ScheduleWidget: ScheduleWidget,
  ClinicalNotesWidget: ClinicalNotesWidget,
  PrescriptionWidget: PrescriptionWidget,
};

export const renderWidget = (type: string, props: any) => {
  const Component = WIDGET_MAP[type];
  if (!Component) {
    return <div className="p-4 bg-red-50 text-red-500 rounded border border-red-200">Unknown Widget: {type}</div>;
  }
  return <Component {...props} />;
};
