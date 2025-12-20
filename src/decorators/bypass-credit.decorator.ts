import { SetMetadata } from '@nestjs/common';
import { BYPASS_CREDIT_CHECK } from '@/src/modules/billing/guards/credit-balance.guard';

export const BypassCreditCheck = () => SetMetadata(BYPASS_CREDIT_CHECK, true);
