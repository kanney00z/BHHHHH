import React from 'react';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { FoodItem } from '../types';
import { motion } from 'motion/react';

interface FoodCardProps {
  item: FoodItem;
  onAddToCart: (item: FoodItem) => void;
  quantityInCart?: number;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onAddToCart, quantityInCart = 0 }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[2rem] overflow-hidden border border-orange-100 hover:shadow-2xl hover:shadow-orange-500/10 transition-all group flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={item.image || `https://picsum.photos/seed/${item.id}/400/400`} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm flex flex-col items-end">
          <span className="text-xs font-bold text-orange-600 leading-none">{item.category}</span>
          {item.category_en && <span className="text-[9px] font-bold text-orange-400 mt-1 leading-none uppercase tracking-wider">{item.category_en}</span>}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 space-y-4">
        <div className="space-y-1">
          <div className="group-hover:text-orange-500 transition-colors">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{item.name}</h3>
            {item.name_en && <p className="text-xs text-gray-500 font-medium mt-0.5">{item.name_en}</p>}
          </div>
          <div className="text-sm text-gray-500 line-clamp-2 leading-relaxed pt-1">
            <p>{item.description}</p>
            {item.description_en && <p className="text-xs text-gray-400 italic mt-0.5">{item.description_en}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">ราคา</span>
            <span className="text-xl font-black text-gray-900">฿{item.price}</span>
          </div>

          <button 
            onClick={() => onAddToCart(item)}
            className="bg-orange-500 text-white p-3 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95 flex items-center gap-2 group/btn"
          >
            {quantityInCart > 0 ? (
              <>
                <span className="text-sm font-bold">{quantityInCart}</span>
                <Plus className="w-5 h-5" />
              </>
            ) : (
              <ShoppingBag className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default FoodCard;
