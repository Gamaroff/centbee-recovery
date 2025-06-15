import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TransactionResult } from "@/lib/services/walletApi/types"
import { cn } from "@/lib/utils"
import moment from "moment"
interface TransactionProps {
  transaction: TransactionResult;
}

export default function TransactionItem({ transaction }: TransactionProps) {
  return (
    <a href={`https://whatsonchain.com/tx/${transaction.transactionId}`} target="_blank" rel="noreferrer">
      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={transaction.participants[0].profilePictureUrl} alt={transaction.participants[0].displayName} />
            <AvatarFallback>{transaction.participants[0].displayName}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{transaction.participants[0].displayName}</div>
            {transaction.note && <div className="text-sm text-muted-foreground">{transaction.note}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            "font-medium",
            transaction.type === 'send' ? 'text-red-600' : 'text-green-600'
          )}>
            {transaction.type === 'send' ? '-' : '+'}${transaction.fiatEquivalent.units.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">
            {moment(new Date(transaction.time * 1000)).format('MMM D, h:mm A')}
          </div>
        </div>
      </div>
    </a>
  )
} 