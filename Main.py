import csv

sales = [
    {"product": "laptop", "quantity": 3, "price": 1200},
    {"product": "phone", "quantity": 5, "price": 800},
    {"product": "tablet", "quantity": 2, "price": 500}
]

with open("sales.csv","w",newline="",encoding="utf-8") as f:
  write=csv.DictWriter(f,fieldnames=["product","quantity","price"])
  write.writeheader()
  write.writerows(sales)
with open("sales.csv","r",encoding="utf-8") as f:
  products=list(csv.DictReader(f))
total=0
for prod in products:
  print(prod["product"]," :",int(prod["quantity"])*int(prod["price"]),"$")
  total+=int(prod["quantity"])*int(prod["price"])
print(f"اجمالي المبيعات :{total} $")
