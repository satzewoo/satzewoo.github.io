let btn = document.getElementById("payButton")
//let language = navigator.language //or fix
let language = "ru-RU"

function pay() {
  console.log(window.location.search.slice(1).split('=')[1])
  const amount = window.location.search.slice(1).split('=')[1]
  var widget = new cp.CloudPayments({
    language: language
  })
  widget.pay('auth', // или 'charge'
    { //options
      publicId: 'test_api_00000000000000000000002', //id из личного кабинета
      description: 'Оплата товаров в example.com', //назначение
      amount: amount, //сумма
      currency: 'KZT', //валюта
      accountId: 'user@example.com', //идентификатор плательщика (необязательно)
      invoiceId: '1234567', //номер заказа  (необязательно)
      skin: "mini", //дизайн виджета (необязательно)
      autoClose: 3
    }, {
      onSuccess: function(options) { // success
        //действие при успешной оплате
      },
      onFail: function(reason, options) { // fail
        //действие при неуспешной оплате
      },
      onComplete: function(paymentResult, options) { //Вызывается как только виджет получает от api.cloudpayments ответ с результатом транзакции.
        //например вызов вашей аналитики Facebook Pixel
      }
    }
  )
}

//window.addEventListener('load', pay)
btn.addEventListener('click', pay)
