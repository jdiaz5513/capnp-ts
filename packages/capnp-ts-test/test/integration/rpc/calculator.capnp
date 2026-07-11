@0x8a93f3c60e7b4d21;

interface Calculator {
    add @0 (a :Float64, b :Float64) -> (sum :Float64);
    getOperator @1 (op :Operator) -> (func :Function);

    enum Operator {
        add @0;
        multiply @1;
    }

    interface Function {
        call @0 (a :Float64, b :Float64) -> (result :Float64);
    }
}
