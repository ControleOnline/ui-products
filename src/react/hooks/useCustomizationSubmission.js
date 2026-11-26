import {useCallback, useEffect, useRef, useState} from 'react';
import {awaitProductConfirmation, isConfirmingProducts} from '@controleonline/ui-orders/src/react/utils/confirmPendingProducts';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {ADD_PRODUCT_CONFIRMATION_EVENT} from '@controleonline/ui-orders/src/react/utils/addProductSession';

// Serialize this inclusion after the catalog's existing confirmation, without
// attributing unrelated order writes to the customization button.
export default function useCustomizationSubmission(waiterMode, orderId) {
  const locked = useRef(false);
  const [stage, setStage] = useState('idle');
  const [confirmingPrevious, setConfirmingPrevious] = useState(false);
  useEffect(() => {
    const sync = () => setConfirmingPrevious(waiterMode && isConfirmingProducts(String(orderId)));
    sync();
    eventBus.on(ADD_PRODUCT_CONFIRMATION_EVENT, sync);
    return () => eventBus.off(ADD_PRODUCT_CONFIRMATION_EVENT, sync);
  }, [waiterMode, orderId]);
  const submit = useCallback(async (orderId, persist) => {
    if (locked.current) return;
    locked.current = true;
    try {
      if (waiterMode) {
        setStage('confirming');
        await awaitProductConfirmation({id: orderId});
      }
      setStage('saving');
      return await persist();
    } finally {
      locked.current = false;
      setStage('idle');
    }
  }, [waiterMode]);
  return {stage, submit, confirmingPrevious};
}
