import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LINE_CHANNEL_ACCESS_TOKEN = "XSOp1dJdNKEw9HGD7fRlN4VJX5fWYmS/EYXqWMMq5pHMtWXOizNLp5FEaNyDbmoalfFkqPBxbn/y9cEWse3hl5OEyUUkKZf9Ej/y2DO5+WLhuLDuIvlkx4LT+imCU+Ptl9kklN7nG1FRzPDemE73tgdB04t89/1O/w1cDnyilFU=";

// @ts-ignore: Deno is the global runtime of Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const order = await req.json();
    
    // Check if order contains a custom item
    const hasCustomItem = order.items && Array.isArray(order.items) && 
      order.items.some((i: any) => (i.customName || i.menuItem?.name || '').includes('เมนูสั่งตามใจ') || i.isCustomItem);
    
    const isAwaitingPayment = order.status === 'awaiting_payment';
    
    // Construct items array for Flex Message
    const itemsBoxArray: any[] = [];
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const optionTotal = (item.selectedOptions || []).reduce((sum: number, opt: any) => sum + (opt.price || 0), 0);
        const unitPrice = (item.menuItem?.price || 0) + optionTotal;
        const itemName = item.customName || item.menuItem?.name || 'Unknown';
        const isThisItemCustom = itemName.includes('เมนูสั่งตามใจ') || item.isCustomItem;

        itemsBoxArray.push({
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "text",
              "text": String(item.quantity) + "x",
              "size": "sm",
              "color": "#ff6b35",
              "weight": "bold",
              "flex": 1
            },
            {
              "type": "text",
              "text": isThisItemCustom ? `✨ ${itemName}` : itemName,
              "size": "sm",
              "color": isThisItemCustom ? "#9333ea" : "#333333",
              "weight": isThisItemCustom ? "bold" : "regular",
              "wrap": true,
              "flex": 4
            },
            {
              "type": "text",
              "text": "฿" + (unitPrice * item.quantity),
              "size": "sm",
              "color": "#111111",
              "align": "end",
              "flex": 2
            }
          ]
        });

        if (item.selectedOptions && item.selectedOptions.length > 0) {
          item.selectedOptions.forEach((opt: any) => {
            itemsBoxArray.push({
              "type": "box",
              "layout": "horizontal",
              "contents": [
                {
                  "type": "text",
                  "text": "  - " + opt.choiceName + (opt.price > 0 ? ` (+฿${opt.price})` : ''),
                  "size": "xs",
                  "color": "#888888",
                  "wrap": true,
                  "flex": 4,
                  "offsetStart": "xl"
                }
              ]
            });
          });
        }
        
        // Add note conditionally
        if (item.note) {
          itemsBoxArray.push({
            "type": "box",
            "layout": "horizontal",
            "paddingBottom": "4px",
            "contents": [
              {
                "type": "text",
                "text": "📝 " + item.note,
                "size": "xs",
                "color": "#ef4444",
                "wrap": true,
                "flex": 4,
                "offsetStart": "xl",
                "style": "italic"
              }
            ]
          });
        }
      });
    }

    if (itemsBoxArray.length === 0) {
      itemsBoxArray.push({
         "type": "text", "text": "ไม่มีรายการอาหาร", "size": "sm", "color": "#888888"
      });
    }

    // Order Type Logic
    const orderTypeLabel: Record<string, string> = {
      delivery: '🛵 จัดส่ง',
      dine_in: '🍽️ ทานที่ร้าน',
      takeaway: '🛍️ กลับบ้าน'
    };
    
    // Default to delivery if undefined, as existing orders might not have it
    let orderTypeStr = orderTypeLabel[order.orderType || 'delivery'] || orderTypeLabel['delivery'];
    if (order.orderType === 'dine_in' && order.tableNumber) {
      orderTypeStr = `🍽️ ทานที่ร้าน (โต๊ะ ${order.tableNumber})`;
    }
    const timeStr = (order.orderType && order.orderType !== 'delivery' && order.pickupTime) ? ` เวลา ${order.pickupTime}` : '';

    const addressStr = order.customerAddress || '';
    const mapUrlMatch = addressStr.match(/https:\/\/maps\.google\.com\/\?q=[^\s\n]+/);
    const mapUrl = mapUrlMatch ? mapUrlMatch[0] : null;

    // Base body contents
    const bodyContents: any[] = [
      {
        "type": "box",
        "layout": "vertical",
        "margin": "md",
        "spacing": "sm",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "คิวที่ (Queue)", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": String(order.queueNumber || '-'), "color": "#FF2D55", "size": "md", "align": "end", "weight": "bold", "flex": 3 }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "ลูกค้า", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": order.customerName || 'ไม่ระบุ', "color": "#111111", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 3 }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "เบอร์โทร", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": order.customerPhone || 'ไม่ระบุ', "color": "#111111", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 3 }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "ประเภท", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": orderTypeStr + timeStr, "color": "#2563eb", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 3 }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "ชำระเงิน", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": order.paymentMethod === 'promptpay' ? '✅ โอนเงิน (พร้อมเพย์)' : '💵 เงินสด', "color": order.paymentMethod === 'promptpay' ? "#10b981" : "#f59e0b", "size": "sm", "align": "end", "weight": "bold", "flex": 3 }
            ]
          }
        ]
      },
      { "type": "separator", "margin": "lg", "color": "#E5E5E5" },
      {
        "type": "box",
        "layout": "vertical",
        "margin": "lg",
        "spacing": "sm",
        "contents": itemsBoxArray
      },
      { "type": "separator", "margin": "lg", "color": "#E5E5E5" },
      ...(order.delivery_fee && order.delivery_fee > 0 ? [
        {
          "type": "box" as const,
          "layout": "horizontal" as const,
          "margin": "lg" as const,
          "contents": [
            { "type": "text" as const, "text": "ค่าอาหาร", "size": "sm" as const, "color": "#888888" as const },
            { "type": "text" as const, "text": "฿" + (order.total - order.delivery_fee), "size": "sm" as const, "color": "#111111" as const, "align": "end" as const }
          ]
        },
        {
          "type": "box" as const,
          "layout": "horizontal" as const,
          "margin": "sm" as const,
          "contents": [
            { "type": "text" as const, "text": "ค่าจัดส่ง", "size": "sm" as const, "color": "#888888" as const },
            { "type": "text" as const, "text": "฿" + order.delivery_fee, "size": "sm" as const, "color": "#111111" as const, "align": "end" as const }
          ]
        }
      ] : []),
      {
        "type": "box",
        "layout": "horizontal",
        "margin": "md",
        "contents": [
          { "type": "text", "text": "ยอดรวมสุทธิ", "size": "md", "color": "#111111", "weight": "bold" },
          { "type": "text", "text": "฿" + order.total, "size": "xl", "color": "#FF2D55", "align": "end", "weight": "bold" }
        ]
      }
    ];

    // Address section if exists (put at the very bottom before slip)
    if (addressStr) {
      bodyContents.splice(bodyContents.length - 1, 0, 
        { "type": "separator", "margin": "lg", "color": "#E5E5E5" },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "md",
          "contents": [
            { "type": "text", "text": "📍 ที่อยู่จัดส่ง", "color": "#888888", "size": "xs", "weight": "bold", "margin": "sm" },
            { "type": "text", "text": addressStr, "color": "#4b5563", "size": "sm", "wrap": true, "margin": "sm" }
          ]
        }
      );
    }

    // Embed slip image directly inside the receipt if found
    if (order.paymentSlipUrl) {
      bodyContents.push({ "type": "separator", "margin": "lg", "color": "#E5E5E5" });
      bodyContents.push({
        "type": "box",
        "layout": "vertical",
        "margin": "xxl",
        "contents": [
          { "type": "text", "text": "หลักฐานการโอนเงิน", "size": "xs", "color": "#aaaaaa", "align": "center", "margin": "sm" },
          {
            "type": "image",
            "url": order.paymentSlipUrl,
            "size": "full",
            "aspectMode": "fit",
            "aspectRatio": "3:4",
            "margin": "md"
          }
        ]
      });
    }

    // Header dynamic color & Text based on status
    let headerColor = "#000000"; // Sleek dark for standard
    let headerTitle = "NEW ORDER ARRIVED";
    let subTitle = "มีออเดอร์ใหม่เข้าสู่ระบบ";
    
    if (hasCustomItem) {
      if (isAwaitingPayment) {
        headerColor = "#10b981"; // Emerald Green for evaluated
        headerTitle = "PAYMENT PENDING";
        subTitle = "ประเมินราคาเสร็จ (รอลูกค้าชำระเงิน)";
      } else {
        headerColor = "#8b5cf6"; // Violet for manual evaluation
        headerTitle = "MANUAL REVIEW REQUIRED";
        subTitle = "ออเดอร์สั่งตามใจ (รอประเมินราคา)";
      }
    }

    // Professional Bento/Card Style Layout
    const flexBubble = {
      "type": "bubble",
      "size": "mega",
      "header": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "24px",
        "backgroundColor": headerColor,
        "contents": [
          {
            "type": "text",
            "text": "YUMDASH PRO POS",
            "color": "#ffffff80",
            "weight": "bold",
            "size": "xxs"
          },
          {
            "type": "text",
            "text": headerTitle,
            "color": "#ffffff",
            "weight": "bold",
            "size": "xl",
            "margin": "sm",
            "wrap": true
          },
          {
            "type": "text",
            "text": subTitle,
            "color": "#ffffffcc",
            "size": "xs",
            "margin": "xs"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "0px",
        "contents": [
          // Info Card
          {
            "type": "box",
            "layout": "vertical",
            "margin": "none",
            "paddingAll": "24px",
            "backgroundColor": "#fcfcfc",
            "contents": [
              {
                "type": "box", "layout": "horizontal", "contents": [
                  { "type": "text", "text": "คิวที่ / Queue", "color": "#8e8e93", "size": "xs", "flex": 1, "weight": "bold" },
                  { "type": "text", "text": `#${order.queueNumber || '-'}`, "color": "#1d1d1f", "size": "sm", "align": "end", "weight": "bold", "flex": 1 }
                ]
              },
              {
                "type": "box", "layout": "horizontal", "margin": "md", "contents": [
                  { "type": "text", "text": "ลูกค้า / Customer", "color": "#8e8e93", "size": "xs", "flex": 1, "weight": "bold" },
                  { "type": "text", "text": order.customerName || 'ไม่ระบุ', "color": "#1d1d1f", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 2 }
                ]
              },
              {
                "type": "box", "layout": "horizontal", "margin": "sm", "contents": [
                  { "type": "text", "text": "ติดต่อ / Phone", "color": "#8e8e93", "size": "xs", "flex": 1 },
                  { "type": "text", "text": order.customerPhone || 'ไม่ระบุ', "color": "#1d1d1f", "size": "xs", "align": "end", "wrap": true, "flex": 2 }
                ]
              },
              {
                "type": "box", "layout": "horizontal", "margin": "xl", "contents": [
                  { "type": "text", "text": "ประเภท / Type", "color": "#8e8e93", "size": "xs", "flex": 1, "weight": "bold" },
                  { "type": "text", "text": orderTypeStr + timeStr, "color": "#007aff", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 2 }
                ]
              },
              {
                "type": "box", "layout": "horizontal", "margin": "md", "contents": [
                  { "type": "text", "text": "ชำระเงิน / Payment", "color": "#8e8e93", "size": "xs", "flex": 1, "weight": "bold" },
                  { "type": "text", "text": order.paymentMethod === 'promptpay' ? 'โอนเงิน (พร้อมเพย์)' : 'เงินสดทอน', "color": order.paymentMethod === 'promptpay' ? "#34c759" : "#ff9500", "size": "sm", "align": "end", "weight": "bold", "flex": 2 }
                ]
              }
            ]
          },
          // Separator line
          {
            "type": "separator", "margin": "md", "color": "#e5e5ea"
          },
          // Items section
          {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "24px",
            "contents": [
              {
                "type": "text", "text": "รายการอาหาร / Order Items", "color": "#8e8e93", "size": "xs", "weight": "bold", "margin": "none"
              },
              { "type": "separator", "margin": "md", "color": "#ffffff" }, // spacing
              ...itemsBoxArray
            ]
          },
          // Separator
          {
            "type": "separator", "margin": "none", "color": "#e5e5ea"
          },
          // Totals Section
          {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "24px",
            "backgroundColor": "#fafafa",
            "contents": [
              ...(order.delivery_fee && order.delivery_fee > 0 ? [
                {
                  "type": "box" as const, "layout": "horizontal" as const, "margin": "none" as const, "contents": [
                    { "type": "text" as const, "text": "ค่าอาหาร / Subtotal", "size": "xs" as const, "color": "#8e8e93" as const, "flex": 2 },
                    { "type": "text" as const, "text": "฿" + (order.total - order.delivery_fee), "size": "sm" as const, "color": "#1d1d1f" as const, "align": "end" as const, "flex": 1 }
                  ]
                },
                {
                  "type": "box" as const, "layout": "horizontal" as const, "margin": "md" as const, "contents": [
                    { "type": "text" as const, "text": "ค่าจัดส่ง / Delivery", "size": "xs" as const, "color": "#8e8e93" as const, "flex": 2 },
                    { "type": "text" as const, "text": "฿" + order.delivery_fee, "size": "sm" as const, "color": "#1d1d1f" as const, "align": "end" as const, "flex": 1 }
                  ]
                }
              ] : []),
              {
                "type": "box", "layout": "horizontal", "margin": (order.delivery_fee && order.delivery_fee > 0) ? "xl" : "none", "contents": [
                  { "type": "text", "text": "ยอดสุทธิ / TOTAL", "size": "sm", "color": "#1d1d1f", "weight": "bold", "flex": 1, "gravity": "center" },
                  { "type": "text", "text": "฿" + order.total, "size": "xxl", "color": headerColor, "align": "end", "weight": "bold", "flex": 2 }
                ]
              }
            ]
          },
          // Address Section
          ...(addressStr ? [
            {
               "type": "separator" as const, "margin": "none" as const, "color": "#e5e5ea" as const
            },
            {
               "type": "box" as const, "layout": "vertical" as const, "paddingAll": "24px" as const, "backgroundColor": "#ffffff" as const, "contents": [
                  { "type": "text" as const, "text": "ที่อยู่จัดส่ง / Delivery Address", "color": "#8e8e93" as const, "size": "xs" as const, "weight": "bold" as const },
                  { "type": "text" as const, "text": addressStr, "color": "#1d1d1f" as const, "size": "sm" as const, "wrap": true as const, "margin": "md" as const }
               ]
            }
          ] : []),
          // Slip Section
          ...(order.paymentSlipUrl ? [
            {
               "type": "separator" as const, "margin": "none" as const, "color": "#e5e5ea" as const
            },
            {
               "type": "box" as const, "layout": "vertical" as const, "paddingAll": "24px" as const, "backgroundColor": "#fafafa" as const, "contents": [
                  { "type": "text" as const, "text": "หลักฐานการโอนเงิน / Receipt Slip", "color": "#8e8e93" as const, "size": "xs" as const, "weight": "bold" as const },
                  {
                    "type": "image" as const,
                    "url": order.paymentSlipUrl,
                    "size": "full" as const,
                    "aspectMode": "fit" as const,
                    "aspectRatio": "3:4" as const,
                    "margin": "lg" as const
                  }
               ]
            }
          ] : [])
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "20px",
        "spacing": "sm",
        "backgroundColor": "#ffffff",
        "contents": [
          ...(mapUrl ? [{
            "type": "button",
            "style": "secondary",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "เปิดแผนที่ (Google Maps)",
              "uri": mapUrl
            }
          }] : []),
          {
            "type": "button",
            "style": "primary",
            "color": headerColor,
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "จัดการออเดอร์ในแอดมิน",
              "uri": "https://yentafoo.vercel.app/admin"
            }
          }
        ]
      }
    };

    const messages: any[] = [
      {
        type: "flex",
        altText: `🛎️ ออเดอร์ใหม่: ${orderTypeStr} จาก ${order.customerName || 'ลูกค้า'} | ยอด: ฿${order.total}`,
        contents: flexBubble
      }
    ];

    const payload = { messages };

    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE Messaging API failed:', errorText);
      return new Response(JSON.stringify({ error: errorText }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.stack || err.message }), { 
      status: 500, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      } 
    });
  }
});
